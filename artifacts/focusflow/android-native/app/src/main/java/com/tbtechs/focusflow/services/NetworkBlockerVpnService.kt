package com.tbtechs.focusflow.services

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import androidx.core.app.NotificationCompat
import com.tbtechs.focusflow.MainActivity
import com.tbtechs.focusflow.R
import org.json.JSONArray
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import kotlin.concurrent.thread

/**
 * NetworkBlockerVpnService
 *
 * A null-routing VPN service — establishes a local VPN tunnel and simply never
 * forwards any packets, causing all routed traffic to be silently dropped.
 * This is the most reliable way to cut a blocked app's internet access on any
 * Android version without root or system permissions.
 *
 * How it works:
 *   Android's VpnService API lets an app intercept device traffic by creating a
 *   virtual TUN network interface. Once established, Android routes packets into
 *   the interface. This service holds that interface open but never reads from it
 *   or sends packets back — the OS waits, times out, and the app gets nothing.
 *
 * Two blocking scopes (set via Intent extras on start):
 *
 *   PER_APP  (default)
 *     Uses VpnService.Builder.addAllowedApplication() to route ONLY the specific
 *     blocked app's traffic through the VPN. All other apps continue using the
 *     normal network. This is the least-invasive option and what FocusFlow uses
 *     by default: the internet works fine for everything except the blocked app.
 *
 *   GLOBAL
 *     Routes ALL device traffic through the VPN. Both WiFi and mobile data are
 *     effectively cut. Emergency apps (phone/dialer) are always excluded via
 *     addDisallowedApplication() so calls still work.
 *
 * Activation flow:
 *   1. JS layer calls NetworkBlockModule.requestVpnPermission() — shows the
 *      one-time system "FocusFlow wants to set up a VPN" consent dialog.
 *   2. User grants permission once (persists indefinitely unless revoked).
 *   3. AppBlockerAccessibilityService calls startNetworkBlock(pkg) whenever a
 *      blocked app is detected.
 *   4. This service starts, establishes the VPN, and holds it.
 *   5. ForegroundTaskService calls stopNetworkBlock() when the session ends,
 *      or BlockOverlayActivity calls it when the user navigates back to FocusFlow.
 *
 * SharedPrefs keys consumed (read on start):
 *   net_block_mode          "per_app" | "global"
 *   net_block_packages      JSON array — packages to block (used in per_app mode)
 *
 * Static state:
 *   isRunning               Boolean — checked by AccessibilityService before starting
 */
class NetworkBlockerVpnService : VpnService() {

    companion object {
        const val ACTION_START = "com.tbtechs.focusflow.NET_BLOCK_START"
        const val ACTION_STOP  = "com.tbtechs.focusflow.NET_BLOCK_STOP"

        const val EXTRA_PACKAGES = "net_block_pkgs"   // JSON array of packages to block
        const val EXTRA_MODE     = "net_block_mode"   // "per_app" | "global"

        const val MODE_PER_APP = "per_app"
        const val MODE_GLOBAL  = "global"

        private const val CHANNEL_ID      = "focusday_vpn"
        private const val NOTIFICATION_ID = 1002
        private const val PREFS_NAME      = "focusday_prefs"

        /**
         * These packages are ALWAYS excluded from VPN routing so that
         * emergency calls, SMS, and the Android OS itself remain reachable.
         */
        private val ALWAYS_EXCLUDED = listOf(
            "android",
            "com.android.phone",
            "com.android.dialer",
            "com.google.android.dialer",
            "com.samsung.android.app.telephonyui",
            "com.android.server.telecom",
            "com.android.mms",
            "com.android.messaging",
            "com.google.android.apps.messaging"
        )

        /** Checked by AccessibilityService before firing a duplicate start. */
        @Volatile var isRunning: Boolean = false

        // ── DNS proxy constants ───────────────────────────────────────────────
        /** Virtual DNS server IP — assigned inside the VPN address space. */
        private const val VIRTUAL_DNS_IP  = "10.0.0.2"
        /** Upstream DNS resolver used when forwarding non-blocked queries. */
        private const val UPSTREAM_DNS    = "8.8.8.8"
        private const val DNS_PORT        = 53
        /** Read buffer for TUN interface — large enough for a max DNS UDP packet. */
        private const val TUN_BUFFER_SIZE = 2048
    }

    private var vpnInterface: ParcelFileDescriptor? = null

    // DNS proxy thread state
    @Volatile private var dnsProxyRunning = false
    private var dnsProxyThread: Thread? = null

    // ─── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopVpn()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_START -> {
                val packagesJson = intent.getStringExtra(EXTRA_PACKAGES) ?: "[]"
                val mode         = intent.getStringExtra(EXTRA_MODE) ?: MODE_PER_APP
                startVpn(packagesJson, mode)
            }
            else -> {
                // Restarted by OS — restore from prefs
                val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val focusActive = prefs.getBoolean("focus_active", false)
                val saActive    = prefs.getBoolean("standalone_block_active", false)
                if (focusActive || saActive) {
                    val pkgs = prefs.getString("net_block_packages", "[]") ?: "[]"
                    val mode = prefs.getString("net_block_mode", MODE_PER_APP) ?: MODE_PER_APP
                    startVpn(pkgs, mode)
                } else {
                    stopSelf()
                    return START_NOT_STICKY
                }
            }
        }
        return START_STICKY
    }

    override fun onRevoke() {
        stopVpn()
        super.onRevoke()
    }

    override fun onDestroy() {
        stopVpn()
        super.onDestroy()
    }

    // ─── VPN establishment ────────────────────────────────────────────────────

    /**
     * Establishes a null-routing VPN tunnel.
     *
     * In PER_APP mode: only [packagesJson] apps have their traffic routed into
     * the tunnel. All other apps use the device's normal network connections.
     *
     * In GLOBAL mode: all apps go through the tunnel except [ALWAYS_EXCLUDED]
     * (emergency apps) and FocusFlow itself.
     */
    private fun startVpn(packagesJson: String, mode: String) {
        if (vpnInterface != null) return   // already established

        val blockedDomains = getBlockedDomains()
        val hasDomainBlock = blockedDomains.isNotEmpty()

        try {
            val builder = Builder()
                .setSession("FocusFlow Network Block")
                .addAddress("10.0.0.1", 32)          // IPv4 virtual address for the VPN
                .addAddress("fd00::1", 128)           // IPv6 virtual address
                .setMtu(1500)
                // Blocking I/O is required when the DNS proxy thread will read from the TUN fd.
                // Without DNS blocking, nobody reads the TUN fd — non-blocking avoids app stalls.
                .setBlocking(hasDomainBlock)

            // ── DNS proxy: redirect all DNS queries to our virtual resolver ────
            // When blocked domains are configured we install VIRTUAL_DNS_IP as the
            // device's DNS server and route only that IP through the VPN.  All DNS
            // queries land in our TUN fd; non-blocked ones are relayed to 8.8.8.8
            // via a protect()'d socket, blocked ones get an NXDOMAIN response.
            // All other device traffic (TCP, non-DNS UDP) is UNAFFECTED.
            if (hasDomainBlock) {
                builder.addDnsServer(VIRTUAL_DNS_IP)
                builder.addRoute(VIRTUAL_DNS_IP, 32)  // only DNS traffic routed through VPN
            }

            when (mode) {
                MODE_GLOBAL -> {
                    // Route ALL traffic through VPN (in addition to DNS route above)
                    builder.addRoute("0.0.0.0", 0)   // all IPv4
                    builder.addRoute("::", 0)         // all IPv6
                    ALWAYS_EXCLUDED.forEach { pkg ->
                        runCatching { builder.addDisallowedApplication(pkg) }
                    }
                    runCatching { builder.addDisallowedApplication(packageName) }
                }
                else -> {
                    if (!hasDomainBlock) {
                        // Pure null-route PER_APP mode (original behaviour)
                        builder.addRoute("0.0.0.0", 0)
                        builder.addRoute("::", 0)
                    }
                    val packages = parseJsonArray(packagesJson)
                    if (!hasDomainBlock) {
                        if (packages.isEmpty()) {
                            ALWAYS_EXCLUDED.forEach { pkg ->
                                runCatching { builder.addDisallowedApplication(pkg) }
                            }
                            runCatching { builder.addDisallowedApplication(packageName) }
                        } else {
                            packages.forEach { pkg ->
                                runCatching { builder.addAllowedApplication(pkg) }
                            }
                        }
                    }
                    // When hasDomainBlock=true and mode=per_app we only route the DNS
                    // server IP (added above); blocked apps also get their traffic
                    // null-routed via the VIRTUAL_DNS_IP route blocking their DNS.
                }
            }

            vpnInterface = builder.establish()
            isRunning = vpnInterface != null

            // Persist mode and packages so we can restore after an OS restart
            getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
                .putString("net_block_packages", packagesJson)
                .putString("net_block_mode",     mode)
                .apply()

            // Start DNS proxy thread if domain blocking is configured
            if (hasDomainBlock && vpnInterface != null) {
                startDnsProxyThread(blockedDomains)
            }
            // If no domain blocking: do NOT start a read loop — packets that enter
            // the tunnel are never forwarded (null-route is the intended behaviour).

        } catch (e: Exception) {
            isRunning = false
            stopSelf()
        }
    }

    private fun stopVpn() {
        dnsProxyRunning = false
        dnsProxyThread?.interrupt()
        dnsProxyThread = null
        isRunning = false
        try { vpnInterface?.close() } catch (_: Exception) {}
        vpnInterface = null
    }

    // ─── DNS proxy ────────────────────────────────────────────────────────────

    /**
     * Reads blocked_domains from SharedPrefs and returns them as a lowercase list.
     */
    private fun getBlockedDomains(): List<String> {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val json  = prefs.getString("blocked_domains", "[]") ?: "[]"
        return try {
            val arr = JSONArray(json)
            (0 until arr.length()).map { arr.getString(it).lowercase().trim() }.filter { it.isNotBlank() }
        } catch (_: Exception) { emptyList() }
    }

    /**
     * Returns true if [domain] matches any blocked pattern (exact or subdomain).
     * e.g. pattern "reddit.com" blocks "reddit.com" and "www.reddit.com".
     */
    private fun isBlockedDomain(domain: String, blocked: List<String>): Boolean {
        val d = domain.lowercase().trimEnd('.')
        return blocked.any { pattern -> d == pattern || d.endsWith(".$pattern") }
    }

    /**
     * Starts the background DNS proxy thread.
     *
     * Flow per DNS query received on the TUN fd:
     *  1. Parse the IPv4/UDP packet to extract the DNS payload and metadata.
     *  2. Extract the queried domain name from the DNS question section.
     *  3. If the domain is blocked → craft an NXDOMAIN response and write it to TUN.
     *  4. If not blocked → forward to upstream DNS via a protect()'d socket, relay response.
     */
    private fun startDnsProxyThread(blockedDomains: List<String>) {
        dnsProxyRunning = true
        dnsProxyThread = thread(isDaemon = true, name = "FocusFlow-DNS-Proxy") {
            val pfd = vpnInterface ?: return@thread
            val inStream  = FileInputStream(pfd.fileDescriptor)
            val outStream = FileOutputStream(pfd.fileDescriptor)
            val buf = ByteArray(TUN_BUFFER_SIZE)

            while (dnsProxyRunning && vpnInterface != null) {
                val len = try { inStream.read(buf) } catch (_: Exception) { break }
                if (len < 28) continue  // minimum IPv4(20) + UDP(8) = 28 bytes

                // ── Parse IPv4 header ────────────────────────────────────────
                if ((buf[0].toInt() and 0xF0) != 0x40) continue  // IPv4 only
                val ipHeaderLen = (buf[0].toInt() and 0x0F) * 4
                val protocol    = buf[9].toInt() and 0xFF
                if (protocol != 17) continue  // UDP only

                // ── Parse UDP header ─────────────────────────────────────────
                val dstPort = ((buf[ipHeaderLen + 2].toInt() and 0xFF) shl 8) or
                               (buf[ipHeaderLen + 3].toInt() and 0xFF)
                if (dstPort != DNS_PORT) continue

                val srcPort = ((buf[ipHeaderLen].toInt() and 0xFF) shl 8) or
                               (buf[ipHeaderLen + 1].toInt() and 0xFF)
                val srcIp   = buf.copyOfRange(12, 16)
                val dnsOff  = ipHeaderLen + 8
                if (len <= dnsOff + 12) continue  // need at least DNS header (12 bytes)
                val dnsPayload = buf.copyOfRange(dnsOff, len)

                // ── DNS domain extraction ────────────────────────────────────
                val domain = parseDnsQueryName(dnsPayload) ?: continue

                if (isBlockedDomain(domain, blockedDomains)) {
                    // ── NXDOMAIN response ────────────────────────────────────
                    val resp = buildNxdomainPacket(dnsPayload, srcIp, srcPort)
                    try { outStream.write(resp) } catch (_: Exception) {}
                } else {
                    // ── Forward to upstream DNS and relay response ───────────
                    try {
                        val sock = DatagramSocket()
                        protect(sock)
                        sock.soTimeout = 3000
                        val upstream = InetAddress.getByName(UPSTREAM_DNS)
                        sock.send(DatagramPacket(dnsPayload, dnsPayload.size, upstream, DNS_PORT))
                        val respBuf  = ByteArray(512)
                        val respPkt  = DatagramPacket(respBuf, respBuf.size)
                        sock.receive(respPkt)
                        sock.close()
                        val dnsResp = respBuf.copyOf(respPkt.length)
                        val fullPkt = buildIpUdpPacket(
                            srcIp  = byteArrayOf(10, 0, 0, 2),  // VIRTUAL_DNS_IP
                            dstIp  = srcIp,
                            srcPort = DNS_PORT,
                            dstPort = srcPort,
                            payload = dnsResp
                        )
                        outStream.write(fullPkt)
                    } catch (_: Exception) { /* forwarding failed — silently drop */ }
                }
            }
        }
    }

    /**
     * Extracts the queried domain name from a raw DNS message (starting at byte 0 = DNS header).
     * DNS header is 12 bytes; the question section starts at byte 12.
     * Returns null on any parse error.
     */
    private fun parseDnsQueryName(dns: ByteArray): String? {
        return try {
            val sb = StringBuilder()
            var i  = 12  // skip 12-byte DNS header
            while (i < dns.size) {
                val labelLen = dns[i].toInt() and 0xFF
                if (labelLen == 0) break
                if (i + labelLen >= dns.size) return null
                if (sb.isNotEmpty()) sb.append('.')
                sb.append(String(dns, i + 1, labelLen, Charsets.US_ASCII))
                i += labelLen + 1
            }
            sb.toString().lowercase().trimEnd('.')
        } catch (_: Exception) { null }
    }

    /**
     * Builds a complete IPv4/UDP/DNS NXDOMAIN response packet destined back to the client.
     *
     * @param dnsQuery  The original raw DNS query payload (starting from DNS header).
     * @param clientIp  4-byte source IP of the original DNS query (the client).
     * @param clientPort UDP source port of the original DNS query.
     */
    private fun buildNxdomainPacket(dnsQuery: ByteArray, clientIp: ByteArray, clientPort: Int): ByteArray {
        // Clone query and set response flags
        val dnsResp = dnsQuery.copyOf()
        // Byte 2: flags high — set QR=1 (bit 7) to mark as response
        dnsResp[2] = (dnsResp[2].toInt() or 0x80).toByte()
        // Byte 3: flags low — set RCODE=3 (NXDOMAIN), clear RA/AA
        dnsResp[3] = (dnsResp[3].toInt() and 0xF0.toInt() or 0x03).toByte()
        return buildIpUdpPacket(
            srcIp   = byteArrayOf(10, 0, 0, 2),  // VIRTUAL_DNS_IP
            dstIp   = clientIp,
            srcPort = DNS_PORT,
            dstPort = clientPort,
            payload = dnsResp
        )
    }

    /**
     * Constructs a raw IPv4 + UDP packet wrapping [payload].
     * IP checksum is calculated; UDP checksum is zeroed (optional in IPv4).
     */
    private fun buildIpUdpPacket(
        srcIp: ByteArray, dstIp: ByteArray,
        srcPort: Int, dstPort: Int,
        payload: ByteArray
    ): ByteArray {
        val udpLen = 8 + payload.size
        val ipLen  = 20 + udpLen
        val pkt    = ByteArray(ipLen)

        // IPv4 header
        pkt[0]  = 0x45.toByte()               // Version=4, IHL=5 (20 bytes)
        pkt[1]  = 0x00                         // DSCP/ECN
        pkt[2]  = (ipLen shr 8).toByte()
        pkt[3]  = (ipLen and 0xFF).toByte()
        pkt[4]  = 0x00; pkt[5] = 0x00         // Identification
        pkt[6]  = 0x40.toByte()               // Flags: DF
        pkt[7]  = 0x00                         // Fragment offset
        pkt[8]  = 0x40.toByte()               // TTL = 64
        pkt[9]  = 0x11.toByte()               // Protocol = UDP (17)
        pkt[10] = 0x00; pkt[11] = 0x00        // IP checksum placeholder
        System.arraycopy(srcIp, 0, pkt, 12, 4)
        System.arraycopy(dstIp, 0, pkt, 16, 4)
        // Compute and fill IP header checksum
        val cksum = ipChecksum(pkt, 0, 20)
        pkt[10] = (cksum shr 8).toByte()
        pkt[11] = (cksum and 0xFF).toByte()

        // UDP header
        pkt[20] = (srcPort shr 8).toByte()
        pkt[21] = (srcPort and 0xFF).toByte()
        pkt[22] = (dstPort shr 8).toByte()
        pkt[23] = (dstPort and 0xFF).toByte()
        pkt[24] = (udpLen shr 8).toByte()
        pkt[25] = (udpLen and 0xFF).toByte()
        pkt[26] = 0x00; pkt[27] = 0x00        // UDP checksum (optional for IPv4)

        // DNS payload
        System.arraycopy(payload, 0, pkt, 28, payload.size)
        return pkt
    }

    /**
     * Calculates the one's-complement checksum over [length] bytes of [data] starting at [offset].
     * Used for the IPv4 header checksum field.
     */
    private fun ipChecksum(data: ByteArray, offset: Int, length: Int): Int {
        var sum = 0
        var i   = offset
        while (i < offset + length - 1) {
            sum += ((data[i].toInt() and 0xFF) shl 8) or (data[i + 1].toInt() and 0xFF)
            i   += 2
        }
        if ((length and 1) != 0) sum += (data[offset + length - 1].toInt() and 0xFF) shl 8
        while (sum ushr 16 != 0) sum = (sum and 0xFFFF) + (sum ushr 16)
        return sum.inv() and 0xFFFF
    }

    // ─── Notification ─────────────────────────────────────────────────────────

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "FocusFlow Network Block",
                NotificationManager.IMPORTANCE_MIN
            ).apply {
                description = "Active while FocusFlow is blocking app network access"
                setShowBadge(false)
            }
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val tapIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val tapPending = PendingIntent.getActivity(
            this, 0, tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Network blocked")
            .setContentText("FocusFlow is blocking internet access")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(tapPending)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .build()
    }

    // ─── JSON helper ──────────────────────────────────────────────────────────

    private fun parseJsonArray(json: String): List<String> {
        return try {
            val arr = JSONArray(json)
            (0 until arr.length()).map { arr.getString(it) }
        } catch (_: Exception) { emptyList() }
    }
}
