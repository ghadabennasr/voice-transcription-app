## Step 1 — Audio Recording (Frontend)

### What was built
A React component (`AudioRecorder.tsx`) that lets the user record their voice from the browser microphone, then play back the recording. Later redesigned with a full branded UI (header, footer, animated voice rings around the record button).

### Why this approach
Used the browser's native `MediaRecorder` API no external library needed, works directly in Next.js with `"use client"`. Audio chunks are collected as they're captured and assembled into a single Blob once recording stops, then converted to a temporary URL so it can be played back immediately in an `<audio>` element.

### How it was tested
Tested manually in the browser: clicked Start, spoke, clicked Stop, then played back the result to confirm the microphone was captured correctly. No backend involved yet, so no Postman/API testing needed at this stage.

### Result
Microphone permission prompt worked correctly, recording and playback worked as expected. Later redesigned the UI with a branded look (violet/teal/coral palette, animated voice rings during recording) confirmed working after the redesign too.

### Screenshots
![Frontend recording UI](./screenshots/step1-frontend-design.png)

## Step 2 — Frontend → Backend (Audio Transport)

### What was built
A Fastify server with two routes: a GET `/` route to check the server is alive, and a POST `/transcribe` route that receives an audio file and confirms it was received (filename + size in bytes). No connection to Gemini yet this step only validates the transport layer.

### Why this approach
Used `@fastify/multipart` to handle file uploads since the frontend will send audio as `multipart/form-data`. Used `@fastify/cors` to allow requests from the frontend (`localhost:3000`) once it's connected — without it, the browser would block the request due to CORS policy.

### How it was tested
Tested with Postman instead of the real frontend, to isolate and confirm the backend works correctly on its own before connecting it to anything else. Two tests: a simple GET request to confirm the server responds, and a POST request with a real audio file (`ma-phrase.mp3`) sent as form-data to confirm the upload and file-reading logic works.

### Result
Both tests passed with `200 OK`. The GET request returned the expected status message. The POST request correctly received the audio file, read its size (150,281 bytes), and returned it in the response confirming the backend can receive and process an audio file before Gemini is even connected.

### Screenshots
![GET test - server status](./screenshots/step2-postman-get.png)
![POST test - audio file received](./screenshots/step2-postman-post.png)

