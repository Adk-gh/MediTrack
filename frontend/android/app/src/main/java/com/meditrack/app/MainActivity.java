package com.meditrack.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();

        // Draw the WebView behind the Android system bars.
        WindowCompat.setDecorFitsSystemWindows(window, false);

        // Make system bars transparent.
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        // Prevent Android from adding contrast overlays.
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }

        applySystemBarAppearance();
    }

    private void applySystemBarAppearance() {
        Window window = getWindow();

        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(
                        window,
                        window.getDecorView()
                );

        if (controller != null) {
            // TRUE = BLACK/DARK status-bar icons.
            controller.setAppearanceLightStatusBars(true);

            // TRUE = BLACK/DARK navigation-bar icons.
            controller.setAppearanceLightNavigationBars(true);
        }
    }

    @Override
    public void onResume() {
        super.onResume();

        applySystemBarAppearance();
    }
}