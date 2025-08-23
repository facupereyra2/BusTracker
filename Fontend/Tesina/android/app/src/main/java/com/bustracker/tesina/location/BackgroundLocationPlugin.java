package com.bustracker.tesina.location;

import android.content.Intent;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "BackgroundLocationServiceInterface")

public class BackgroundLocationPlugin extends Plugin {

    private static String origin;
    private static String destination;
    private static String schedule;
    private static String preOriginCoord;

    @PluginMethod
    public void startService(PluginCall call) {
        origin = call.getString("origin", "");
        destination = call.getString("destination", "");
        schedule = call.getString("schedule", "");
        preOriginCoord = call.getString("preOriginCoord", "");

        Intent serviceIntent = new Intent(getContext(), BackgroundLocationService.class);
        serviceIntent.putExtra("origin", origin);
        serviceIntent.putExtra("destination", destination);
        serviceIntent.putExtra("schedule", schedule);
        serviceIntent.putExtra("preOriginCoord", preOriginCoord);

        try {
            getContext().startForegroundService(serviceIntent);
            call.resolve();
        } catch (Exception e) {
            e.printStackTrace();
            call.reject("No se pudo iniciar el servicio: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        Intent serviceIntent = new Intent(getContext(), BackgroundLocationService.class);
        getContext().stopService(serviceIntent);

        call.resolve();
    }
    public static String getOrigin() {
        return origin;
    }

    public static String getDestination() {
        return destination;
    }

    public static String getSchedule() {
        return schedule;
    }

    public static String getPreOriginCoord() {
        return preOriginCoord;
    }
}
