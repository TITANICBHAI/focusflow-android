package com.tbtechs.nodespy.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.tbtechs.nodespy.ui.screens.AutoPinScreen
import com.tbtechs.nodespy.ui.screens.CaptureListScreen
import com.tbtechs.nodespy.ui.screens.InspectorScreen
import com.tbtechs.nodespy.ui.screens.PackageFilterScreen
import com.tbtechs.nodespy.ui.screens.PermissionsScreen
import com.tbtechs.nodespy.ui.screens.WizardScreen

@Composable
fun NodeSpyApp(
    showWizard: Boolean = false,
    initialCaptureId: String? = null,
    onLaunchBubble: () -> Unit = {},
    onWizardDone: () -> Unit = {}
) {
    val nav = rememberNavController()
    val start = if (showWizard) "wizard" else "captures"

    LaunchedEffect(initialCaptureId) {
        if (initialCaptureId != null) {
            nav.navigate("inspector/$initialCaptureId")
        }
    }

    NavHost(navController = nav, startDestination = start) {
        composable("captures") {
            CaptureListScreen(
                onOpenCapture = { id -> nav.navigate("inspector/$id") },
                onLaunchBubble = onLaunchBubble,
                onOpenPermissions = { nav.navigate("setup") },
                onOpenWizard = { nav.navigate("wizard") },
                onOpenPackageFilter = { nav.navigate("package_filter") },
                onOpenAutoPinRules = { nav.navigate("auto_pin") }
            )
        }
        composable(
            "inspector/{captureId}",
            arguments = listOf(navArgument("captureId") { type = NavType.StringType })
        ) { back ->
            val id = back.arguments?.getString("captureId") ?: return@composable
            InspectorScreen(captureId = id, onBack = { nav.popBackStack() })
        }
        composable("setup") {
            PermissionsScreen(onBack = { nav.popBackStack() })
        }
        composable("wizard") {
            WizardScreen(
                onFinish = {
                    onWizardDone()
                    if (nav.previousBackStackEntry != null) {
                        nav.popBackStack()
                    } else {
                        nav.navigate("captures") { popUpTo("wizard") { inclusive = true } }
                    }
                },
                onOpenSetup = {
                    onWizardDone()
                    nav.navigate("setup") { popUpTo("wizard") { inclusive = true } }
                }
            )
        }
        composable("package_filter") {
            PackageFilterScreen(onBack = { nav.popBackStack() })
        }
        composable("auto_pin") {
            AutoPinScreen(onBack = { nav.popBackStack() })
        }
    }
}
