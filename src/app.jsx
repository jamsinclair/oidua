import { useState, useEffect } from 'preact/hooks'
import './app.css'

let audioContext = null;

const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
}

const getMediaRecorder = () => {
  const constraints = { audio: true }

  return new Promise((resolve, reject) => {
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      resolve(new MediaRecorder(stream))
    }, reject)
  })
}

const getAudioSamples = (audio) => {
  initAudioContext();
  return new Promise(async (resolve, reject) => {
    const buffer = await audio.arrayBuffer();
    audioContext.decodeAudioData(buffer, function(buff) {
      resolve({
        sampleRate: buff.sampleRate,
        samples: buff.getChannelData(0)
      })
    });
  });
}

const playSamples = ({ samples, sampleRate }, reverse = false) => {
    initAudioContext();
    audioContext.resume();
    let audioBuffer = audioContext.createBuffer(1, samples.length, sampleRate);
    let audio = audioBuffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) {
      const index = reverse ? samples.length - i - 1 : i;
      audio[i] = samples[index];
    }
    let source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
}

function RecordButton ({ onRecordStopped }) {
  const [isRecordQueued, setIsRecordQueued] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const label = isRecording ? 'Stop Recording' : 'Record';
  const onClick = () => setIsRecordQueued((isRecordQueued) => !isRecordQueued);
  
  useEffect(() => {
    const startRecording = async () => {
      setIsRecording(true);
      const mediaRecorder = await getMediaRecorder();
      setMediaRecorder(mediaRecorder);
      let chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        console.log('recording stopped');
        onRecordStopped(chunks);
        setIsRecording(false);
        setMediaRecorder(null);
        chunks = null;
      }
      mediaRecorder.start();
      console.log("recorder started");
    }

    if (isRecordQueued && !isRecording && !mediaRecorder) {
      startRecording();
    }

    if (!isRecordQueued && mediaRecorder) {
      mediaRecorder.stop();
    }
  }, [isRecording, isRecordQueued]);

  return <button className="audio-button" disabled={!isRecordQueued && isRecording} onClick={onClick}>{label}</button>
}

export function App() {
  const [sampleData, setSampleData] = useState(null);
  const onRecordStopped = async (chunks) => {
    const blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
    setSampleData(await getAudioSamples(blob));
  };

  const onPlay = () => {
    if (!sampleData) {
      return;
    }
    playSamples(sampleData);
  }

  const onPlayReversed = () => {
    if (!sampleData) {
      return;
    }
    playSamples(sampleData, true);
  }

  return (
    <>
      <h1>Oidua</h1>
      <RecordButton onRecordStopped={onRecordStopped} />
      <button className="audio-button" disabled={!sampleData} onClick={onPlay}>Play</button>
      <button className="audio-button" disabled={!sampleData} onClick={onPlayReversed}>yalP</button>
    </>
  )
}
