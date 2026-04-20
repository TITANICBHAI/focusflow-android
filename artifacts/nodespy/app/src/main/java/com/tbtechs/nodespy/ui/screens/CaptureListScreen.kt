package com.tbtechs.nodespy.ui.screens

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.tbtechs.nodespy.data.CaptureStore
import com.tbtechs.nodespy.data.NodeCapture
import com.tbtechs.nodespy.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CaptureListScreen(
    onOpenCapture: (String) -> Unit,
    onLaunchBubble: () -> Unit = {},
    onOpenPermissions: () -> Unit = {},
    onOpenWizard: () -> Unit = {},
    onOpenPackageFilter: () -> Unit = {},
    onOpenAutoPinRules: () -> Unit = {}
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var refreshTick by remember { mutableIntStateOf(0) }

    DisposableEffect(lifecycleOwner) {
        val obs = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) refreshTick++
        }
        lifecycleOwner.lifecycle.addObserver(obs)
        onDispose { lifecycleOwner.lifecycle.removeObserver(obs) }
    }

    val captures by CaptureStore.captures.collectAsState()
    val serviceRunning by CaptureStore.serviceRunning.collectAsState()
    val loggingOn by CaptureStore.loggingEnabled.collectAsState()
    val snapOn by CaptureStore.screenshotEnabled.collectAsState()
    val pinnedIds by CaptureStore.bubblePinnedIds.collectAsState()
    val allowlist by CaptureStore.packageAllowlist.collectAsState()
    val rules by CaptureStore.autoPinRules.collectAsState()

    var searchQuery by remember { mutableStateOf("") }
    var searchOpen by remember { mutableStateOf(false) }
    var showExportHistory by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }
    val focusManager = LocalFocusManager.current

    val allPermissionsOk = remember(refreshTick, serviceRunning) {
        val overlayOk = Settings.canDrawOverlays(context)
        val notifOk = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
                    PackageManager.PERMISSION_GRANTED
        } else true
        serviceRunning && overlayOk && notifOk
    }

    val filteredCaptures = remember(captures, searchQuery) {
        if (searchQuery.isBlank()) captures
        else {
            val q = searchQuery.lowercase()
            captures.filter { c ->
                c.pkg.lowercase().contains(q) ||
                        c.activityClass.lowercase().contains(q) ||
                        c.nodes.any { n ->
                            n.resId?.lowercase()?.contains(q) == true ||
                                    n.text?.lowercase()?.contains(q) == true ||
                                    n.cls.lowercase().contains(q)
                        }
            }
        }
    }

    Scaffold(
        containerColor = Background,
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            "NodeSpy",
                            color = OnBackground,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 20.sp
                        )
                        Spacer(Modifier.width(10.dp))
                        ServiceBadge(running = serviceRunning)
                        if (allowlist.isNotEmpty()) {
                            Spacer(Modifier.width(6.dp))
                            FilterBadge(count = allowlist.size)
                        }
                        if (rules.any { it.enabled }) {
                            Spacer(Modifier.width(6.dp))
                            AutoPinBadge(count = rules.count { it.enabled })
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface),
                actions = {
                    IconButton(onClick = {
                        searchOpen = !searchOpen
                        if (!searchOpen) {
                            searchQuery = ""
                            focusManager.clearFocus()
                        }
                    }) {
                        Icon(
                            if (searchOpen) Icons.Default.SearchOff else Icons.Default.Search,
                            "Search",
                            tint = if (searchOpen) AccentGreen else Muted
                        )
                    }
                    IconButton(onClick = onOpenWizard) {
                        Icon(Icons.Default.HelpOutline, "Guide", tint = Muted)
                    }
                    IconButton(onClick = onOpenPermissions) {
                        Icon(
                            if (allPermissionsOk) Icons.Default.Shield else Icons.Default.ShieldMoon,
                            "Permissions",
                            tint = if (allPermissionsOk) AccentGreen else AccentOrange
                        )
                    }
                    IconButton(onClick = onLaunchBubble) {
                        Icon(Icons.Default.BubbleChart, "Launch Bubble", tint = AccentBlue)
                    }
                    Box {
                        IconButton(onClick = { showMenu = true }) {
                            Icon(Icons.Default.MoreVert, "More", tint = Muted)
                        }
                        DropdownMenu(
                            expanded = showMenu,
                            onDismissRequest = { showMenu = false },
                            containerColor = Surface
                        ) {
                            DropdownMenuItem(
                                text = {
                                    MenuRow(
                                        icon = Icons.Default.FilterList,
                                        label = "Package Filter",
                                        badge = if (allowlist.isNotEmpty()) "${allowlist.size}" else null,
                                        color = AccentGreen
                                    )
                                },
                                onClick = { showMenu = false; onOpenPackageFilter() }
                            )
                            DropdownMenuItem(
                                text = {
                                    MenuRow(
                                        icon = Icons.Default.PushPin,
                                        label = "Auto-Pin Rules",
                                        badge = if (rules.isNotEmpty()) "${rules.size}" else null,
                                        color = AccentOrange
                                    )
                                },
                                onClick = { showMenu = false; onOpenAutoPinRules() }
                            )
                            DropdownMenuItem(
                                text = {
                                    val histCount = CaptureStore.exportHistory.value.size
                                    MenuRow(
                                        icon = Icons.Default.History,
                                        label = "Export History",
                                        badge = if (histCount > 0) "$histCount" else null,
                                        color = AccentBlue
                                    )
                                },
                                onClick = { showMenu = false; showExportHistory = true }
                            )
                            if (captures.isNotEmpty()) {
                                HorizontalDivider(color = SurfaceVar)
                                DropdownMenuItem(
                                    text = {
                                        MenuRow(
                                            icon = Icons.Default.DeleteSweep,
                                            label = "Clear All",
                                            badge = null,
                                            color = AccentRed
                                        )
                                    },
                                    onClick = { showMenu = false; CaptureStore.clearAll() }
                                )
                            }
                        }
                    }
                }
            )
        }
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Background)
        ) {
            AnimatedVisibility(
                visible = searchOpen,
                enter = expandVertically(),
                exit = shrinkVertically()
            ) {
                SearchBar(
                    query = searchQuery,
                    onQueryChange = { searchQuery = it },
                    focusRequester = focusRequester,
                    onClose = {
                        searchQuery = ""
                        searchOpen = false
                        focusManager.clearFocus()
                    }
                )
                LaunchedEffect(searchOpen) {
                    if (searchOpen) focusRequester.requestFocus()
                }
            }

            if (!serviceRunning) {
                ServiceBanner(
                    message = "Accessibility service is off — NodeSpy cannot capture nodes",
                    actionLabel = "Enable",
                    color = AccentOrange
                ) { context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }
            }

            if (!Settings.canDrawOverlays(context)) {
                ServiceBanner(
                    message = "Draw over apps permission missing — floating bubble disabled",
                    actionLabel = "Fix",
                    color = AccentRed
                ) { onOpenPermissions() }
            }

            if (loggingOn || snapOn || pinnedIds.isNotEmpty()) {
                BubbleStatusBar(loggingOn = loggingOn, snapOn = snapOn, pinnedCount = pinnedIds.size)
            }

            if (filteredCaptures.isEmpty()) {
                if (searchQuery.isNotBlank()) {
                    NoResultsState(query = searchQuery)
                } else {
                    EmptyState(serviceRunning)
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(filteredCaptures, key = { it.id }) { capture ->
                        CaptureCard(
                            capture = capture,
                            onClick = { onOpenCapture(capture.id) },
                            onStarToggle = { CaptureStore.toggleStar(capture.id) }
                        )
                    }
                }
            }
        }
    }

    if (showExportHistory) {
        ExportHistorySheet(onDismiss = { showExportHistory = false })
    }
}

@Composable
private fun SearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    focusRequester: FocusRequester,
    onClose: () -> Unit
) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(Surface)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        OutlinedTextField(
            value = query,
            onValueChange = onQueryChange,
            modifier = Modifier
                .weight(1f)
                .focusRequester(focusRequester),
            placeholder = {
                Text(
                    "Search pkg, activity, node ID, text…",
                    color = Muted,
                    fontSize = 13.sp
                )
            },
            singleLine = true,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = {}),
            leadingIcon = {
                Icon(Icons.Default.Search, null, tint = AccentGreen, modifier = Modifier.size(18.dp))
            },
            trailingIcon = {
                if (query.isNotEmpty()) {
                    IconButton(onClick = { onQueryChange("") }, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.Close, "Clear", tint = Muted, modifier = Modifier.size(16.dp))
                    }
                }
            },
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = AccentGreen,
                unfocusedBorderColor = Muted.copy(alpha = 0.5f),
                focusedTextColor = OnBackground,
                unfocusedTextColor = OnBackground,
                cursorColor = AccentGreen
            ),
            textStyle = LocalTextStyle.current.copy(fontSize = 13.sp, fontFamily = FontFamily.Monospace)
        )
        IconButton(onClick = onClose, modifier = Modifier.size(36.dp)) {
            Icon(Icons.Default.Close, "Close search", tint = Muted)
        }
    }
}

@Composable
private fun MenuRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    badge: String?,
    color: androidx.compose.ui.graphics.Color
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Icon(icon, null, tint = color, modifier = Modifier.size(18.dp))
        Text(label, color = OnBackground, fontSize = 14.sp)
        Spacer(Modifier.weight(1f))
        if (badge != null) {
            Box(
                Modifier
                    .clip(RoundedCornerShape(4.dp))
                    .background(color.copy(alpha = 0.15f))
                    .padding(horizontal = 6.dp, vertical = 1.dp)
            ) {
                Text(badge, color = color, fontSize = 10.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun FilterBadge(count: Int) {
    Box(
        Modifier
            .clip(RoundedCornerShape(3.dp))
            .background(AccentGreen.copy(alpha = 0.15f))
            .padding(horizontal = 5.dp, vertical = 1.dp)
    ) {
        Text(
            "FILTER $count",
            color = AccentGreen,
            fontSize = 9.sp,
            fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun AutoPinBadge(count: Int) {
    Box(
        Modifier
            .clip(RoundedCornerShape(3.dp))
            .background(AccentOrange.copy(alpha = 0.15f))
            .padding(horizontal = 5.dp, vertical = 1.dp)
    ) {
        Text(
            "PIN $count",
            color = AccentOrange,
            fontSize = 9.sp,
            fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun BubbleStatusBar(loggingOn: Boolean, snapOn: Boolean, pinnedCount: Int) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(SurfaceVar)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StatusChip(label = "LOG", active = loggingOn, activeColor = AccentGreen)
        StatusChip(label = "SNAP", active = snapOn, activeColor = AccentBlue)
        if (pinnedCount > 0) {
            Box(
                Modifier
                    .clip(RoundedCornerShape(4.dp))
                    .background(AccentOrange.copy(alpha = 0.15f))
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            ) {
                Text(
                    "$pinnedCount pinned",
                    color = AccentOrange,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
private fun StatusChip(label: String, active: Boolean, activeColor: androidx.compose.ui.graphics.Color) {
    val color = if (active) activeColor else Muted
    Box(
        Modifier
            .clip(RoundedCornerShape(4.dp))
            .background(color.copy(alpha = 0.12f))
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Text(
            if (active) "● $label" else "○ $label",
            color = color,
            fontSize = 11.sp,
            fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun ServiceBadge(running: Boolean) {
    val color = if (running) AccentGreen else AccentRed
    val label = if (running) "LIVE" else "OFF"
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .clip(RoundedCornerShape(4.dp))
            .background(color.copy(alpha = 0.15f))
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Icon(
            if (running) Icons.Default.FiberManualRecord else Icons.Default.RadioButtonUnchecked,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(8.dp)
        )
        Spacer(Modifier.width(4.dp))
        Text(label, color = color, fontSize = 11.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun ServiceBanner(
    message: String,
    actionLabel: String,
    color: androidx.compose.ui.graphics.Color,
    onAction: () -> Unit
) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(color.copy(alpha = 0.12f))
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(message, color = color, fontSize = 13.sp, modifier = Modifier.weight(1f))
        Spacer(Modifier.width(8.dp))
        TextButton(onClick = onAction) {
            Text(actionLabel, color = color, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun EmptyState(serviceRunning: Boolean) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.Search, contentDescription = null, tint = Muted, modifier = Modifier.size(56.dp))
            Spacer(Modifier.height(16.dp))
            Text(
                if (serviceRunning) "Open any app to capture its node tree"
                else "Enable the accessibility service to start",
                color = Muted, fontSize = 15.sp
            )
        }
    }
}

@Composable
private fun NoResultsState(query: String) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.SearchOff, null, tint = Muted, modifier = Modifier.size(52.dp))
            Spacer(Modifier.height(14.dp))
            Text("No matches for \"$query\"", color = OnBackground, fontSize = 15.sp)
            Spacer(Modifier.height(6.dp))
            Text(
                "Try searching by package, activity, node ID or text",
                color = Muted,
                fontSize = 13.sp,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                modifier = Modifier.padding(horizontal = 32.dp)
            )
        }
    }
}

@Composable
private fun CaptureCard(
    capture: NodeCapture,
    onClick: () -> Unit,
    onStarToggle: () -> Unit
) {
    val fmt = remember { SimpleDateFormat("HH:mm:ss", Locale.getDefault()) }
    val shortPkg = capture.pkg.substringAfterLast('.')
    val shortCls = capture.activityClass.substringAfterLast('.')
    val hasScreenshot = capture.screenshotPath != null
    val hasAutoPins = capture.autoPinnedIds.isNotEmpty()

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (capture.starred) AccentOrange.copy(alpha = 0.05f) else Surface
        ),
        shape = RoundedCornerShape(10.dp)
    ) {
        Row(
            Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(AccentBlue.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    shortPkg.take(2).uppercase(),
                    color = AccentBlue,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    fontSize = 14.sp
                )
            }

            Spacer(Modifier.width(12.dp))

            Column(Modifier.weight(1f)) {
                Text(
                    capture.pkg,
                    color = OnBackground,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    shortCls,
                    color = Muted,
                    fontSize = 12.sp,
                    fontFamily = FontFamily.Monospace,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (hasAutoPins) {
                    Spacer(Modifier.height(4.dp))
                    Box(
                        Modifier
                            .clip(RoundedCornerShape(3.dp))
                            .background(AccentOrange.copy(alpha = 0.12f))
                            .padding(horizontal = 5.dp, vertical = 1.dp)
                    ) {
                        Text(
                            "⚡ ${capture.autoPinnedIds.size} auto-pinned",
                            color = AccentOrange,
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            Spacer(Modifier.width(8.dp))

            Column(horizontalAlignment = Alignment.End) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (hasScreenshot) {
                        Box(
                            Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(AccentBlue.copy(alpha = 0.15f))
                                .padding(horizontal = 5.dp, vertical = 2.dp)
                        ) { Text("📷", fontSize = 10.sp) }
                    }
                    NodeCountBadge(capture.nodes.size)
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    fmt.format(Date(capture.timestamp)),
                    color = Muted,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace
                )
                Spacer(Modifier.height(4.dp))
                IconButton(
                    onClick = onStarToggle,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        if (capture.starred) Icons.Default.Star else Icons.Default.StarBorder,
                        contentDescription = if (capture.starred) "Unstar" else "Star",
                        tint = if (capture.starred) AccentOrange else Muted,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun NodeCountBadge(count: Int) {
    Box(
        Modifier
            .clip(RoundedCornerShape(4.dp))
            .background(SurfaceVar)
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Text(
            "$count nodes",
            color = AccentGreen,
            fontSize = 11.sp,
            fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.Bold
        )
    }
}
