// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCYY2GQqS0tCXb7Oxw8AWXhpexq9e8VRUs",
  authDomain: "aspirehub-32863.firebaseapp.com",
  projectId: "aspirehub-32863",
  storageBucket: "aspirehub-32863.appspot.com",
  messagingSenderId: "686810111182",
  appId: "1:686810111182:web:4290b4b1b6e64934ec449f",
  measurementId: "G-KX41R0SSMY"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();



// If already logged in, redirect to dashboard
auth.onAuthStateChanged(user => {
  if (user) window.location = 'anjan.html';
});

// Persist login
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Theme persistence
const savedTheme = localStorage.getItem('theme');
document.body.dataset.theme = savedTheme || 'light';

// Auto-redirect if logged in
auth.onAuthStateChanged(user => { if (user) location = 'anjan.html'; });

window.toggleTheme = () => {
  const root = document.body;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  localStorage.setItem('theme', next);
};

window.login = () => {
  const email = document.getElementById('email').value;
  const pw    = document.getElementById('password').value;
  auth.signInWithEmailAndPassword(email, pw)
    .then(() => location.href = 'anjan.html')
    .catch(e => alert(e.message));
};

window.signup = () => {
  const email = document.getElementById('email').value;
  const pw    = document.getElementById('password').value;
  auth.createUserWithEmailAndPassword(email, pw)
    .then(() => location.href = 'anjan.html')
    .catch(e => alert(e.message));
};