class RecordService {
    stream = null;
    recorder = null;
    resultPromise = Promise.resolve();
    isRecording = false;

    async start () {
        if (this.isRecording) {
            return;
        }

        const chunks = [];
        this.isRecording = true;
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.recorder = new MediaRecorder(this.stream);
        this.recorder.ondataavailable = (e) => chunks.push(e.data);
        this.resultPromise = new Promise((resolve) => {
            this.recorder.onstop = () => {
                console.log('stopped recording');
                this.isRecording = false;
                this.stream?.getTracks().forEach(track => track.stop());
                this.stream = null;
                this.recorder = null;
                resolve(chunks);
            }
        });
        this.recorder.start();
    }

    async stop () {
        if (!this.isRecording || !this.stream) {
            return;
        }

        this.recorder.stop();
        console.log(this.recorder)
        return this.resultPromise;
    }
}

export const recordService = new RecordService();
