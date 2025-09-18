const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

// ---- Get All Users (without Admins) ----
exports.getAllUsers = async (req, res) => {
  try {
    const usersRef = admin.firestore().collection("users");
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "No users found" });
    }

    let users = [];
    snapshot.forEach((doc) => {
      const data = doc.data();

      // skip admin users
      if (data.isAdmin) return;

      users.push({
        uid: doc.id,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        address: data.address || null,
        createdAt: data.createdAt || null,
      });
    });

    if (users.length === 0) {
      return res.status(404).json({ message: "No non-admin users found" });
    }

    return res.status(200).json({ users });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
// ---- Get User Details by ID ----
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params; // User ID from URL
    const userRef = admin.firestore().collection("users").doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userDoc.data();

    // Fetch subcollections
    const subcollectionsSnapshot = await userRef.listCollections();
    let subcollectionsData = {};

    for (const subCol of subcollectionsSnapshot) {
      const subColSnapshot = await subCol.get();
      subcollectionsData[subCol.id] = [];
      subColSnapshot.forEach((doc) => {
        subcollectionsData[subCol.id].push({
          id: doc.id,
          ...doc.data(),
        });
      });
    }

    return res.status(200).json({
      uid: userDoc.id,
      ...userData,
      subcollections: subcollectionsData,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.registerUser = async (req, res) => {
try {
const { name, email, password, address, phone } = req.body;


if (!name || !email || !password) {
return res.status(400).json({ message: 'name, email and password are required' });
}


const userRecord = await admin.auth().createUser({
email,
password,
displayName: name,
phoneNumber: phone || undefined,
});


// Hash password before storing in Firestore (never store plain text)
const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(password, salt);


const userDoc = {
name,
email,
password: hashedPassword,
isAdmin: false,
address: address || null,
phone: phone || null,
createdAt: admin.firestore.FieldValue.serverTimestamp(),
};


await admin.firestore().collection('users').doc(userRecord.uid).set(userDoc);


return res.status(201).json({
message: 'User registered and saved to Firestore ✅',
uid: userRecord.uid,
email: userRecord.email,
name: userRecord.displayName,
address: userDoc.address,
phone: userDoc.phone,
isAdmin: userDoc.isAdmin
});
} catch (err) {
if (err.code && err.code.startsWith('auth/')) {
return res.status(400).json({ error: err.message, code: err.code });
}
return res.status(500).json({ error: err.message });
}
};

// ---- Edit / Update User ----
exports.editUser = async (req, res) => {
  try {
    const { uid } = req.params; // URL param se uid aayega
    const { name, email, password, address, phone } = req.body;

    if (!uid) {
      return res.status(400).json({ message: "User UID is required" });
    }

    const userRef = admin.firestore().collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    // Firestore ke liye update object
    let updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (address) updateData.address = address;
    if (phone) updateData.phone = phone;

    // Agar password update karna ho toh hash karke save karo
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateData.password = hashedPassword;
    }

    // Update Firestore
    await userRef.update(updateData);

    // Update Firebase Auth bhi (sirf email, password, displayName, phone)
    let authUpdateData = {};
    if (name) authUpdateData.displayName = name;
    if (email) authUpdateData.email = email;
    if (phone) authUpdateData.phoneNumber = phone;
    if (password) authUpdateData.password = password;

    if (Object.keys(authUpdateData).length > 0) {
      await admin.auth().updateUser(uid, authUpdateData);
    }

    return res.status(200).json({ message: "User updated successfully ✅" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ---- Delete User ----
exports.deleteUser = async (req, res) => {
  try {
    const { uid } = req.params; // URL param se uid aayega

    if (!uid) {
      return res.status(400).json({ message: "User UID is required" });
    }

    // Firestore se delete
    await admin.firestore().collection("users").doc(uid).delete();

    // Firebase Auth se delete
    await admin.auth().deleteUser(uid);

    return res.status(200).json({ message: "User deleted successfully ❌" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ---- Login ----
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const userSnapshot = await admin.firestore()
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      return res.status(404).json({ error: "User not found" });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    // Password check karo
    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const token = await admin.auth().createCustomToken(userDoc.id);

    res.json({
      message: "Login successful",
      token,
      isAdmin: userData.isAdmin === true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

