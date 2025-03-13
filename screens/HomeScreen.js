import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

export default function HomeScreen({ navigation, route }) {
  const [reminders, setReminders] = useState([]);

  // Cargar recordatorios al iniciar y cuando se actualiza la pantalla
  useEffect(() => {
    loadReminders();

    // Actualizar la lista cuando se regrese de otra pantalla
    const unsubscribe = navigation.addListener("focus", () => {
      loadReminders();
    });

    return unsubscribe;
  }, [navigation]);

  // Cargar recordatorios desde AsyncStorage
  const loadReminders = async () => {
    try {
      const savedReminders = await AsyncStorage.getItem("medicationReminders");
      if (savedReminders) {
        setReminders(JSON.parse(savedReminders));
      }
    } catch (error) {
      console.error("Error al cargar recordatorios:", error);
      Alert.alert("Error", "No se pudieron cargar los recordatorios");
    }
  };

  // Eliminar un recordatorio
  const deleteReminder = async (id) => {
    try {
      // Cancelar la notificación programada
      await Notifications.cancelScheduledNotificationAsync(id);

      // Eliminar de la lista local
      const updatedReminders = reminders.filter(
        (reminder) => reminder.id !== id
      );
      setReminders(updatedReminders);

      // Guardar en AsyncStorage
      await AsyncStorage.setItem(
        "medicationReminders",
        JSON.stringify(updatedReminders)
      );

      Alert.alert("Éxito", "Recordatorio eliminado correctamente");
    } catch (error) {
      console.error("Error al eliminar recordatorio:", error);
      Alert.alert("Error", "No se pudo eliminar el recordatorio");
    }
  };

  // Confirmar eliminación
  const confirmDelete = (id) => {
    Alert.alert(
      "Confirmar eliminación",
      "¿Estás seguro de que quieres eliminar este recordatorio?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          onPress: () => deleteReminder(id),
          style: "destructive",
        },
      ]
    );
  };

  // Renderizar cada item de la lista
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.reminderItem}
      onPress={() => navigation.navigate("ReminderDetail", { reminder: item })}
    >
      <View style={styles.reminderInfo}>
        <Text style={styles.medicationName}>{item.medication}</Text>
        <Text style={styles.doseText}>{item.dose}</Text>
        <Text style={styles.timeText}>
          {new Date(item.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {item.frequency === "daily"
            ? " (Diario)"
            : item.frequency === "weekly"
            ? ` (Cada ${getDayName(item.weekDay)})`
            : " (Una vez)"}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => confirmDelete(item.id)}
      >
        <Ionicons name="trash-outline" size={24} color="red" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Obtener nombre del día de la semana
  const getDayName = (dayIndex) => {
    const days = [
      "domingo",
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
    ];
    return days[dayIndex];
  };

  return (
    <View style={styles.container}>
      {reminders.length > 0 ? (
        <FlatList
          data={reminders}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No hay recordatorios de medicamentos
          </Text>
          <Text style={styles.emptySubText}>
            Presiona el botón + para agregar uno nuevo
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("AddReminder")}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  listContainer: {
    padding: 16,
  },
  reminderItem: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  reminderInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  doseText: {
    fontSize: 16,
    color: "#555",
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: "#007bff",
  },
  deleteButton: {
    padding: 8,
  },
  addButton: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#007bff",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#555",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
  },
});
