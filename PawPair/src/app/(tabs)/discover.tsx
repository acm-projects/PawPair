
// import { useEffect, useState } from "react";

// import {
//   View,
//   Text,
//   FlatList,
//   StyleSheet,
//   ActivityIndicator,
//   TouchableOpacity
// } from "react-native";

// import { getAuth } from "firebase/auth";
// import { app } from "../../firebase.js";

// import { getAnimals } from "../../services/animalServices";

// import {
//   addFavorite,
//   getFavorites
// } from "../../services/favoriteServices";

// // Define the structure of each animal
// type Pet = {
//   id: string;
//   name: string;
//   species: string;
//   breed: string;
//   age: number;
//   size: string;
//   description: string;
//   adoptionStatus: string;
// };

// export default function DiscoverScreen() {

//   // Store animals retrieved from Firestore
//   const [animals, setAnimals] = useState<Pet[]>([]);

//   // Track loading and errors
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   // Store favorite pet IDs
//   const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

//   // Track which pet is currently being saved
//   const [savingPetId, setSavingPetId] = useState<string | null>(null);

//   // Display confirmation messages
//   const [message, setMessage] = useState("");

//   // Retrieve animals when the screen loads
//   useEffect(() => {

//     async function loadAnimals() {
//       try {
//         const data = await getAnimals();

//         setAnimals(data as Pet[]);

//         console.log("Animals retrieved:", data);
//         console.log("Total animals:", data.length);

//         // Retrieve the current user's favorites
//         const auth = getAuth(app);
//         const uid = auth.currentUser?.uid;

//         if (uid) {
//           try {
//             const savedFavorites = await getFavorites(uid);
//             setFavoriteIds(savedFavorites);
//           } catch (favoriteError) {
//             console.error(
//               "Error retrieving favorites:",
//               favoriteError
//             );
//           }
//         }

//       } catch (error) {
//         console.error("Error retrieving animals:", error);
//         setError("Could not load animals.");

//       } finally {
//         setLoading(false);
//       }
//     }

//     loadAnimals();

//   }, []);

//   // Add a pet to the user's favorites
//   async function handleFavorite(petId: string) {

//     const auth = getAuth(app);
//     const uid = auth.currentUser?.uid;

//     // Make sure the user is logged in
//     if (!uid) {
//       setMessage("Please log in to save pets.");
//       return;
//     }

//     // Avoid saving a pet that is already favorited
//     if (favoriteIds.includes(petId)) {
//       return;
//     }

//     setSavingPetId(petId);
//     setMessage("");

//     try {

//       // Save the favorite in Firestore
//       await addFavorite(uid, petId);

//       // Update the screen immediately
//       setFavoriteIds(previous => [...previous, petId]);

//       const pet = animals.find(item => item.id === petId);

//       setMessage(
//         `${pet?.name || "Pet"} added to favorites!`
//       );

//       console.log("Pet added to favorites:", petId);

//     } catch (error) {
//       console.error("Error saving favorite:", error);

//       setMessage("Could not save favorite. Please try again.");

//     } finally {
//       setSavingPetId(null);
//     }
//   }

//   // Display loading screen
//   if (loading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="teal" />
//         <Text>Loading available pets...</Text>
//       </View>
//     );
//   }

//   // Display the Discover Pets screen
//   return (
//     <View style={styles.container}>

//       <Text style={styles.title}>
//         Discover Pets
//       </Text>

//       <Text style={styles.subtitle}>
//         Find your perfect companion!
//       </Text>

//       {/* Confirmation or error message */}
//       {message !== "" && (
//         <Text style={styles.message}>
//           {message}
//         </Text>
//       )}

//       {/* Display Firestore loading errors */}
//       {error !== "" ? (
//         <Text style={styles.error}>
//           {error}
//         </Text>

//       ) : animals.length === 0 ? (
//         <Text>No available pets found.</Text>

//       ) : (

//         <FlatList
//           data={animals}
//           keyExtractor={(item) => item.id}
//           contentContainerStyle={styles.list}

//           renderItem={({ item }) => {

//             const isFavorite = favoriteIds.includes(item.id);
//             const isSaving = savingPetId === item.id;

//             return (
//               <View style={styles.card}>

//                 <Text style={styles.name}>
//                   {item.name}
//                 </Text>

//                 <Text>Species: {item.species}</Text>

//                 <Text>Breed: {item.breed}</Text>

//                 <Text>Age: {item.age} years</Text>

//                 <Text>Size: {item.size}</Text>

//                 <Text>
//                   Status: {item.adoptionStatus}
//                 </Text>

//                 <Text style={styles.description}>
//                   {item.description}
//                 </Text>

//                 {/* Add to Favorites button */}
//                 <TouchableOpacity
//                   style={[
//                     styles.favoriteButton,
//                     isFavorite && styles.savedButton
//                   ]}
//                   onPress={() => handleFavorite(item.id)}
//                   disabled={isFavorite || savingPetId !== null}
//                 >

//                   {isSaving ? (
//                     <ActivityIndicator color="white" />

//                   ) : (
//                     <Text style={styles.favoriteText}>
//                       {isFavorite
//                         ? "♥ Added to Favorites"
//                         : "♡ Add to Favorites"}
//                     </Text>
//                   )}

//                 </TouchableOpacity>

//               </View>
//             );
//           }}
//         />

//       )}

//     </View>
//   );
// }

// // Styling
// const styles = StyleSheet.create({

//   container: {
//     flex: 1,
//     padding: 20,
//     backgroundColor: "#fff"
//   },

//   loadingContainer: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 12
//   },

//   title: {
//     fontSize: 26,
//     fontWeight: "bold",
//     marginBottom: 8
//   },

//   subtitle: {
//     fontSize: 16,
//     color: "#666",
//     marginBottom: 20
//   },

//   list: {
//     paddingBottom: 20
//   },

//   card: {
//     padding: 18,
//     marginBottom: 15,
//     backgroundColor: "#f5f5f5",
//     borderRadius: 10
//   },

//   name: {
//     fontSize: 20,
//     fontWeight: "bold",
//     marginBottom: 8
//   },

//   description: {
//     marginTop: 10,
//     color: "#555",
//     lineHeight: 20
//   },

//   favoriteButton: {
//     backgroundColor: "teal",
//     padding: 12,
//     marginTop: 15,
//     borderRadius: 6,
//     alignItems: "center"
//   },

//   savedButton: {
//     backgroundColor: "#508C65"
//   },

//   favoriteText: {
//     color: "white",
//     fontSize: 15,
//     fontWeight: "bold"
//   },

//   message: {
//     color: "teal",
//     fontSize: 14,
//     marginBottom: 12
//   },

//   error: {
//     color: "red",
//     fontSize: 14
//   }

// });
