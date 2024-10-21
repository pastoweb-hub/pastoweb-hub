const preview = document.getElementById('preview');
const recordButton = document.getElementById('recordButton');
const opacitySlider = document.getElementById('opacitySlider');
const toggleCameraButton = document.getElementById('toggleCameraButton');
const toggleMenuButton = document.getElementById('toggleMenuButton');
const menu = document.getElementById('menu');
const { createClient } = require("webdav");

let mediaRecorder;
let recordedChunks = [];
let currentStream;
let cameraIsOn = true;
let isRecording = false;

// 初めはpreviewを透明に設定
preview.style.opacity = 0;
startCamera();

// WebDAVクライアントの設定
const client = createClient("https://domi.teracloud.jp/dav/", {
    username: "thigslist",
    password: "4NXYTc6EPZnuGxpa"
});

// メニューの表示/非表示を切り替える関数
toggleMenuButton.addEventListener('click', () => {
    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'flex';  // メニューを表示
    } else {
        menu.style.display = 'none';  // メニューを非表示
    }
});

// スライダーの値を変更するたびに透過度を調整
opacitySlider.addEventListener('input', () => {
    const opacityValue = opacitySlider.value / 100;
    preview.style.opacity = opacityValue;
});

// カメラを開始する関数
function startCamera(facingMode = "environment") {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: facingMode } }, 
        audio: true
    })
    .then(stream => {
        currentStream = stream;
        preview.srcObject = stream;
        preview.play();

        // 録画の設定
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            if (recordedChunks.length > 0) {
                const recordedBlob = new Blob(recordedChunks, { type: 'video/webm' });
                await uploadRecording(recordedBlob);  // ダウンロードの代わりにアップロード
            } else {
                alert('録画データがありません');
            }
            recordedChunks = [];
        };
        
    })
    .catch(error => {
        console.error('カメラの使用に失敗しました:', error);
    });
}

// カメラのオン・オフを切り替える関数
function toggleCamera() {
    if (cameraIsOn) {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            isRecording = false;
            recordButton.textContent = '▶️';
        }

        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        preview.srcObject = null;
        cameraIsOn = false;
        toggleCameraButton.textContent = '⚫';
    } else {
        startCamera();
        cameraIsOn = true;
        toggleCameraButton.textContent = '🔵';
    }
}

// 録画を開始/停止する関数
function toggleRecording() {
    if (!cameraIsOn) {
        alert("カメラがオフになっています。カメラをオンにしてから録画を開始してください。");
        return;  // カメラがオフの場合、録画は開始しない
    }

    if (!isRecording) {
        if (!mediaRecorder || mediaRecorder.state === "inactive") {
            mediaRecorder.start(1000);  //1000ミリ秒ごとにチャンクに保存する
            recordButton.textContent = '⏹️';  // 停止ボタンに切り替える
            isRecording = true;
        }
    } else {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            recordButton.textContent = '▶️';  // 開始ボタンに切り替える
            isRecording = false;
        }
    }
}

// 録画をWebDAVサーバーにアップロードする関数
async function uploadRecording(blob) {
    const filename = generateFilename();
    try {
        await client.putFileContents(`/path/to/upload/${filename}`, blob, { overwrite: true });
        alert(`ファイル ${filename} がアップロードされました。`);
    } catch (error) {
        console.error('アップロードに失敗しました:', error);
        alert('アップロードに失敗しました。');
    }
}

// ファイル名を生成する関数
function generateFilename() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}.webm`;
}

// 録画ボタンのイベントリスナーを追加
recordButton.addEventListener('click', toggleRecording);

// カメラオンオフボタンのイベントリスナーを追加
toggleCameraButton.addEventListener('click', toggleCamera);

// 初期状態ではメニューを非表示にする場合は、次の行をコメントアウトしてください。
menu.style.display = 'flex';
