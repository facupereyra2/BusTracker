package com.bustracker.tesina.location;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

import com.bustracker.tesina.R;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;

public class BackgroundLocationService extends Service {

    private String origin;
    private String destination;
    private String schedule;
    private String preOriginCoord;

    private LocationManager locationManager;
    private LocationListener locationListener;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            origin = intent.getStringExtra("origin");
            destination = intent.getStringExtra("destination");
            schedule = intent.getStringExtra("schedule");
            preOriginCoord = intent.getStringExtra("preOriginCoord");

            System.out.println("Servicio iniciado con: origin=" + origin + ", destination=" + destination);
        }

        createNotificationChannel();

        Notification notification = new NotificationCompat.Builder(this, "bgLocation")
                .setContentTitle("Bus Tracker")
                .setContentText("Compartiendo ubicación en segundo plano")
                .setSmallIcon(R.drawable.ic_launcher_foreground)
                .build();

        startForeground(1, notification);

        locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);

        locationListener = new LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                if (location != null) {
                    double lat = location.getLatitude();
                    double lng = location.getLongitude();

                    DatabaseReference ref = FirebaseDatabase.getInstance()
                            .getReference("location_test");

                    LocationData locData = new LocationData(lat, lng);
                    ref.setValue(locData);

                    System.out.println("Ubicación actualizada: " + lat + ", " + lng);
                }
            }

            @Override
            public void onStatusChanged(String provider, int status, Bundle extras) {}

            @Override
            public void onProviderEnabled(String provider) {}

            @Override
            public void onProviderDisabled(String provider) {}
        };

        // Verificar permisos antes de registrar listener
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            // No hay permisos, no hacer nada o avisar
            return START_STICKY;
        }

        // Registrar listener para recibir actualizaciones cada 30 segundos o 10 metros de cambio
        locationManager.requestLocationUpdates(
                LocationManager.GPS_PROVIDER,
                30000, // 30 segundos
                10,    // 10 metros
                locationListener
        );

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (locationManager != null && locationListener != null) {
            locationManager.removeUpdates(locationListener);
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    "bgLocation",
                    "Background Location Channel",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }

    // Clase simple para guardar latitud y longitud en Firebase
    public static class LocationData {
        public double latitude;
        public double longitude;

        public LocationData() {
            // Constructor vacío necesario para Firebase
        }

        public LocationData(double latitude, double longitude) {
            this.latitude = latitude;
            this.longitude = longitude;
        }
    }
}
