// App.js
import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { enableScreens } from "react-native-screens";
enableScreens();

// Importar pantallas
import HomeScreen from "./screens/HomeScreen";
import AddReminderScreen from "./screens/AddReminderScreen";
import ReminderDetailScreen from "./screens/ReminderDetailScreen";

// Configurar notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createStackNavigator();

export default function App() {
  // Solicitar permisos para notificaciones al inicio
  useEffect(() => {
    registerForPushNotificationsAsync();

    const foregroundSubscription =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notificación recibida:", notification);
      });

    // Listener para cuando el usuario interactúa con una notificación
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Respuesta de notificación:", response);
      });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: "Mis Recordatorios de Medicamentos",
            headerTitleStyle: {
              fontSize: 20,
              fontWeight: "bold",
              color: "#000000",
              textAlign: "center",
              marginBottom: 8,
            },
          }}
        />
        <Stack.Screen
          name="AddReminder"
          component={AddReminderScreen}
          options={{ title: "Agregar Recordatorio" }}
        />
        <Stack.Screen
          name="ReminderDetail"
          component={ReminderDetailScreen}
          options={{ title: "Detalles del Recordatorio" }}
        />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

// Función para solicitar permisos de notificaciones
async function registerForPushNotificationsAsync() {
  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("¡Se requieren permisos de notificación!");
      return;
    }
  } else {
    console.log("Las notificaciones solo funcionan en dispositivos físicos");
  }
}
