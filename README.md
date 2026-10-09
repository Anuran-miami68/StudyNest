# StudyNest

E-learning site with a **real-time doubt system**: a student raises a doubt → every logged-in
teacher's device rings instantly → the teacher clicks **"I'm available now"** → the student's
device buzzes.

## Run it (a server is now required)
1. Install Node.js (nodejs.org) and open this folder in the VS Code terminal.
2. `npm install`   (first time only)
3. `npm start`
4. Open **http://localhost:3000** (don't double-click the html files any more).

## Accounts
No demo accounts. Use **Sign up** to create one student and one teacher account.

## Try the doubt feature
Open the site in two browser windows (or two devices). Log in as student in one, teacher in the other.
On **both**, click **"🔊 Enable sound & desktop alerts"** once (browsers block sound until you click).
Student: *Ask a Doubt* → send. Teacher hears the ring. Teacher: **"I'm available now"** → student hears the buzzer.

## Using two different devices
Same Wi-Fi: open `http://<your-PC-IP>:3000` on the other device.
Over the internet: deploy this folder to Render / Railway (start command `npm start`).
Desktop pop-up notifications need `localhost` or HTTPS; ring/buzzer and in-page alerts work everywhere.

## Structure
server.js (Express + Socket.io, auth, doubts, data.json storage) · public/ (html, css/style.css, js/main.js, auth.js, doubts.js, quiz.js)
