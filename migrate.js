const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC2L5aTJph7PH1NFICagEiPxJUv8EJGdRQ",
  authDomain: "coach-zen.firebaseapp.com",
  projectId: "coach-zen",
  storageBucket: "coach-zen.firebasestorage.app",
  messagingSenderId: "11447267838",
  appId: "1:11447267838:web:7474c717cc7932c3a910af"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const OLD_ID = 'user_ud8kmjj0g';
const NEW_ID = 'DXphYNk6z0gj2yi2B9cUf9f8ojL2';

async function migrate() {
  console.log('🚀 Migration des données...');
  console.log(`   Ancien ID: ${OLD_ID}`);
  console.log(`   Nouvel ID: ${NEW_ID}`);
  
  const keys = ['allData', 'profile', 'weightHistory'];
  
  for (const key of keys) {
    try {
      console.log(`\n📦 Migration de "${key}"...`);
      
      const oldDoc = await getDoc(doc(db, 'users', OLD_ID, 'data', key));
      
      if (oldDoc.exists()) {
        const data = oldDoc.data();
        console.log(`   ✅ Données trouvées`);
        
        await setDoc(doc(db, 'users', NEW_ID, 'data', key), data);
        console.log(`   ✅ Copié vers nouveau compte`);
      } else {
        console.log(`   ⚠️ Pas de données`);
      }
    } catch (err) {
      console.error(`   ❌ Erreur:`, err.message);
    }
  }
  
  console.log('\n🎉 Migration terminée !');
  console.log('Rafraîchis l\'app pour voir tes données.');
  process.exit(0);
}

migrate();
