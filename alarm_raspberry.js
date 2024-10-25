const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
require('dotenv').config()

// Firebaseプロジェクトの設定
const firebaseConfig = {
  projectId: process.env.PROJECT_Id,
  appId: process.env.APP_Id,
};

// Firebaseアプリの初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getAlarms(db) {
  const alarmsCol = collection(db, "alarms");
  const alarmSnapshot = await getDocs(alarmsCol);
  const alarmList = alarmSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(), 
  }));
  return alarmList;
}

getAlarms(db)
  .then((alarms) => {
    console.log("alarm list:", alarms);
  })
  .catch((error) => {
    console.error("Error fetching alarms:", error);
  });
