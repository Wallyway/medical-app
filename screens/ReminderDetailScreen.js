import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ReminderDetailScreen({ route, navigation }) {
  const { reminder } = route.params;

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

  // Formatear la fecha/hora
  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString("es-CO"),
      time: date.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  // Eliminar un recordatorio
  const deleteReminder = async () => {
    try {
      // Cancelar la notificación programada
      await Notifications.cancelScheduledNotificationAsync(reminder.id);

      // Eliminar de AsyncStorage
      const savedReminders = await AsyncStorage.getItem("medicationReminders");
      if (savedReminders) {
        const remindersArray = JSON.parse(savedReminders);
        const updatedReminders = remindersArray.filter(
          (item) => item.id !== reminder.id
        );
        await AsyncStorage.setItem(
          "medicationReminders",
          JSON.stringify(updatedReminders)
        );
      }

      Alert.alert("Éxito", "Recordatorio eliminado correctamente");
      navigation.goBack();
    } catch (error) {
      console.error("Error al eliminar recordatorio:", error);
      Alert.alert("Error", "No se pudo eliminar el recordatorio");
    }
  };

  // Confirmar eliminación
  const confirmDelete = () => {
    Alert.alert(
      "Confirmar eliminación",
      "¿Estás seguro de que quieres eliminar este recordatorio?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", onPress: deleteReminder, style: "destructive" },
      ]
    );
  };

  const formattedDateTime = formatDateTime(reminder.time);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{reminder.medication}</Text>
          <TouchableOpacity onPress={confirmDelete}>
            <Ionicons name="trash-outline" size={24} color="red" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles del medicamento</Text>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Categoría:</Text>
            <Text style={styles.value}>{reminder.category}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Dosis:</Text>
            <Text style={styles.value}>
              {reminder.quantity} {reminder.dose}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Programación</Text>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Frecuencia:</Text>
            <Text style={styles.value}>
              {reminder.frequency === "daily"
                ? "Diario"
                : reminder.frequency === "weekly"
                ? "Semanal"
                : "Una vez"}
            </Text>
          </View>

          {reminder.frequency === "weekly" && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Día:</Text>
              <Text style={styles.value}>{getDayName(reminder.weekDay)}</Text>
            </View>
          )}

          {reminder.frequency === "once" && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Fecha:</Text>
              <Text style={styles.value}>{formattedDateTime.date}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.label}>Hora:</Text>
            <Text style={styles.value}>{formattedDateTime.time}</Text>
          </View>
        </View>

        {reminder.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notas adicionales</Text>
            <Text style={styles.notes}>{reminder.notes}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            Alert.alert(
              "Funcionalidad no disponible",
              "La edición de recordatorios no está disponible en esta versión. Puedes eliminar este recordatorio y crear uno nuevo."
            );
          }}
        >
          <Text style={styles.editButtonText}>Editar Recordatorio</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Estilos para ReminderDetailScreen.js
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  section: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007bff",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
    width: "30%",
  },
  value: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  notes: {
    fontSize: 16,
    color: "#333",
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 6,
    fontStyle: "italic",
  },
  editButton: {
    backgroundColor: "#007bff",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
  },
  editButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
