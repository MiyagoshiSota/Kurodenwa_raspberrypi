const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

require("dotenv").config();

let alarms = [];

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

//アラームの作成時にトリガーされる
exports.createuser = onDocumentCreated("alarms/{alarmId}", (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log("No data associated with the event");
    return;
  }

  const data = snapshot.data();
  const name = data.name;

  console.log(name);

  alarms = getAlarms(db);
});