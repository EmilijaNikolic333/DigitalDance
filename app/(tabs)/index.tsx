import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    // 1. Proveri da LinearGradient ima flex: 1
    <LinearGradient
      colors={['#F8ECFF', '#D294FB']}
      style={styles.background}
    >
      <StatusBar barStyle="dark-content" />
      
      {/* 2. Container ne sme imati svoju backgroundColor jer će prekriti gradijent */}
      <View style={styles.container}>
        <Text style={styles.title}>DIVE INTO SPOTLIGHT</Text>
        
        
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1, // Ovo osigurava da gradijent pokrije ceo ekran
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    // PAŽNJA: Ovde ne sme biti backgroundColor
  },
  title: {
    fontSize: 44, 
    fontWeight: "bold",
    marginBottom: 30,
    color: "#093A7D",
    textAlign: 'center',
  },
  card: {
    width: "100%",
    padding: 25,
    borderRadius: 15,
    backgroundColor: "#ffffff",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  plateDisplay: {
    fontSize: 32,
    fontWeight: "900",
    color: "#007AFF",
    letterSpacing: 2,
  },
});