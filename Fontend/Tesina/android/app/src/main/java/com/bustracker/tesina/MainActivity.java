package com.bustracker.tesina;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.bustracker.tesina.location.BackgroundLocationPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Registrar plugin manualmente
        registerPlugin(BackgroundLocationPlugin.class);
    }
}
