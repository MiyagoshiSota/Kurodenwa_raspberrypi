const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const cron = require("node-cron");
const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  getDocs,
  onSnapshot,
} = require("firebase/firestore");
require("dotenv").config();

let isRinging = false;
let boolAlarmList = new Map();
let voiceDataMap = new Map(); // voiceデータを保持するためのマップ
let currentVoice = null; // 現在のvoiceを保持

// シリアルポートの設定
const port = new SerialPort({ path: "/dev/ttyACM0", baudRate: 9600 });
const bellport = new SerialPort({ path: "/dev/ttyUSB0", baudRate: 9600 });

// 改行で区切ってデータをパース
const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

// データを受信したときの処理
parser.on("data", (data) => {
  const dataArray = data.split(",");
  if (dataArray[0] == "0" && isRinging) {
    isRinging = false;
    sendData("0");

    // 現在のアラームのvoiceを取得してsendVoiceDataに渡す
    if (currentVoice) {
      sendVoiceData(currentVoice);
      currentVoice = null; // voiceの送信後にリセット
    }
  }
});

function sendData(data) {
  bellport.write(data + "\n", (err) => {
    if (err) {
      console.log("error", err.message);
    } else {
      isRinging = true;
    }
  });
}

function sendVoiceData(data) {
  port.write(data + "\n", (err) => {
    if (err) {
      console.log("error", err.message);
    }
  });
}

// Firebaseプロジェクトの設定
const firebaseConfig = {
  projectId: process.env.PROJECT_Id,
  appId: process.env.APP_Id,
};

// Firebaseアプリの初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const snapshotDB = collection(db, "alarms");

// アラームデータの監視とジョブのスケジュール設定
onSnapshot(snapshotDB, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === "added") {
      const docId = change.doc.id;
      const { time, week_day, alarm_status, voice } = change.doc.data();
      voiceDataMap.set(docId, voice); // docIDごとにvoiceデータを保持
      createFunctionForDoc(docId, time, week_day, alarm_status)();
    } else if (change.type === "modified") {
      const job = boolAlarmList.get(change.doc.id);
      const { alarm_status, voice } = change.doc.data();
      voiceDataMap.set(change.doc.id, voice); // 更新がある度にvoiceを更新
      if (alarm_status) job.start();
      else job.stop();
    }
  });
});

function createFunctionForDoc(id, time, week_day, alarm_status) {
  return () => {
    const formattedWd = week_day === "" ? "*" : week_day;
    const timeArray = time.split(":");
    const job = cron.schedule(
      `0 ${timeArray[1]} ${timeArray[0]} * * ${formattedWd}`,
      () => {
        sendData("1");
        console.log("アラームが発火しました");

        // アラーム発火時にcurrentVoiceにvoiceデータを設定
        currentVoice = voiceDataMap.get(id);
      }
    );

    boolAlarmList.set(id, job);
    if (alarm_status) job.start();
    else job.stop();
  };
}
