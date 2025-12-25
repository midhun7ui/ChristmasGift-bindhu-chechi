// --- Global Variables ---
let threeScene, threeCamera, threeRenderer, backgroundSound;
let bookCover, bookSpine, pageOne;

const container = document.getElementById('book-container');
const cardApp = document.getElementById('xmas-card-app');
const startBtn = document.getElementById('start-btn');
const giftBox = document.getElementById('gift-box');
const landingScreen = document.getElementById('landing-screen');
const finalMessage = document.getElementById('final-message');

// New elements for multi-page functionality
const bookMessagesContainer = document.getElementById('book-messages-container');
const puzzleHint = document.getElementById('puzzle-hint');
const revealPuzzleBtn = document.getElementById('reveal-puzzle-btn');

// New elements for Gemini TTS (Page 1)
const ttsBtn = document.getElementById('tts-btn');
const ttsAudio = document.getElementById('tts-audio');
const ttsStatus = document.getElementById('tts-status');

// New elements for Gemini Recipe (Page 3)
const recipePromptInput = document.getElementById('recipe-prompt');
const generateRecipeBtn = document.getElementById('generate-recipe-btn');
const recipeOutput = document.getElementById('recipe-output');
const recipeLoader = document.getElementById('recipe-loader');

let currentPage = 1;
const totalPages = 3; // Now 3 pages
const bookWidth = 2;
const bookHeight = 3;
const bookDepth = 0.2;

const apiKey = "AIzaSyBJPd4iVLa1cxExvABFTxTuBWAh1I0qt_w"; // Default API Key

document.addEventListener('DOMContentLoaded', () => {
    // Initial fade-in
    gsap.to(cardApp, { opacity: 1, duration: 1 });

    // Initialize all major components
    initHowler();
    initLottie();
    initGSAPSnow();
    initThreeJS();

    // --- Event Listeners ---
    startBtn.addEventListener('click', startExperience);
    giftBox.addEventListener('click', handleGiftBoxClick);

    // Listeners for page navigation
    document.getElementById('next-page-btn-1').addEventListener('click', () => handleNextPage());
    document.getElementById('next-page-btn-2').addEventListener('click', () => handleNextPage());
    document.getElementById('next-page-btn-3').addEventListener('click', showGiftSurprise); // Final page leads to gift

    // Listeners for interactivity
    revealPuzzleBtn.addEventListener('click', revealPuzzleHint);
    ttsBtn.addEventListener('click', handleTTS);
    generateRecipeBtn.addEventListener('click', generateRecipe);
    
    // Initial setup: position all pages correctly for sliding effect
    for (let i = 1; i <= totalPages; i++) {
        const page = document.getElementById(`page-${i}`);
        if (i !== currentPage) {
            gsap.set(page, { x: '100%' }); // Hide pages except the first one
        } else {
                gsap.set(page, { x: '0%', opacity: 1 }); // Ensure page 1 is visible
        }
    }
});

// --- Utility Functions for Gemini API ---

/**
 * Converts base64 string to ArrayBuffer.
 */
function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Converts signed PCM 16-bit audio data to a WAV Blob.
 * Assumes input is Int16Array (signed 16-bit PCM).
 */
function pcmToWav(pcm16, sampleRate = 24000) {
    const buffer = new ArrayBuffer(44 + pcm16.length * 2);
    const view = new DataView(buffer);
    let offset = 0;

    function writeString(s) {
        for (let i = 0; i < s.length; i++) {
            view.setUint8(offset + i, s.charCodeAt(i));
        }
        offset += s.length;
    }

    function writeUint32(i) {
        view.setUint32(offset, i, true);
        offset += 4;
    }

    function writeUint16(i) {
        view.setUint16(offset, i, true);
        offset += 2;
    }

    // RIFF chunk descriptor
    writeString('RIFF');
    writeUint32(36 + pcm16.length * 2); // Chunk size
    writeString('WAVE');
    
    // FMT sub-chunk
    writeString('fmt ');
    writeUint32(16); // Sub-chunk size (16 for PCM)
    writeUint16(1);  // Audio format (1 for PCM)
    writeUint16(1);  // Number of channels (1)
    writeUint32(sampleRate);
    writeUint32(sampleRate * 2); // Byte rate (SampleRate * NumChannels * 2)
    writeUint16(2);  // Block align (NumChannels * 2)
    writeUint16(16); // Bits per sample (16)
    
    // Data sub-chunk
    writeString('data');
    writeUint32(pcm16.length * 2); // Sub-chunk size (DataSize)

    // Write PCM data
    for (let i = 0; i < pcm16.length; i++) {
        view.setInt16(offset, pcm16[i], true); // Write signed 16-bit little-endian
        offset += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
}

/**
 * 🗣️ Handles Text-to-Speech generation using Gemini API.
 */
async function handleTTS() {
    const textToSpeak = "സന്തോഷകരമായ ക്രിസ്മസ് ആശംസകൾ ബിന്ദു ചേച്ചി! ഈ ആഘോഷവേളയിൽ നിങ്ങൾക്ക് അനന്തമായ സന്തോഷവും സമാധാനവും നേരുന്നു.";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-tts:generateContent?key=${apiKey}`;
    const maxRetries = 3;
    let currentRetry = 0;

    ttsStatus.textContent = 'Generating speech... 🎅';
    ttsBtn.disabled = true;

    const payload = {
        contents: [{ parts: [{ text: textToSpeak }] }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: "Achird" } // Friendly voice
                }
            }
        },
        model: "gemini-2.5-flash-tts"
    };

    while (currentRetry < maxRetries) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }

            const result = await response.json();
            const part = result?.candidates?.[0]?.content?.parts?.[0];
            const audioData = part?.inlineData?.data;
            const mimeType = part?.inlineData?.mimeType;

            if (audioData && mimeType && mimeType.startsWith("audio/")) {
                // Extract sample rate from mimeType (e.g., audio/L16; rate=24000)
                const rateMatch = mimeType.match(/rate=(\d+)/);
                const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
                
                const pcmData = base64ToArrayBuffer(audioData);
                const pcm16 = new Int16Array(pcmData);
                const wavBlob = pcmToWav(pcm16, sampleRate);
                const audioUrl = URL.createObjectURL(wavBlob);
                
                ttsAudio.src = audioUrl;
                ttsAudio.style.display = 'block';
                ttsStatus.textContent = 'Ready to play!';
                
                // Pause background music
                if (backgroundSound) backgroundSound.pause();
                
                ttsAudio.play();
                
                // Resume background music when TTS ends
                ttsAudio.onended = () => {
                    if (backgroundSound) backgroundSound.play();
                };
            } else {
                ttsStatus.textContent = 'Error: No audio data in response.';
            }
            ttsBtn.disabled = false;
            return; // Success
        } catch (error) {
            console.error('TTS API error:', error);
            currentRetry++;
            if (currentRetry < maxRetries) {
                const delay = Math.pow(2, currentRetry) * 1000;
                ttsStatus.textContent = `Retrying in ${delay / 1000}s...`;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    // Fallback to Browser TTS
    console.warn('Gemini TTS failed, switching to browser fallback.');
    ttsStatus.textContent = 'Using browser voice...';
    playFallbackTTS(textToSpeak);
    ttsBtn.disabled = false;
}

/**
 * 🗣️ Fallback TTS using Browser SpeechSynthesis
 */
function playFallbackTTS(text) {
    if (!window.speechSynthesis) {
        ttsStatus.textContent = "Sorry, your browser doesn't support speech.";
        return;
    }

    let utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    // 1. Try to find a Malayalam voice
    let preferredVoice = voices.find(voice => voice.lang === 'ml-IN' || voice.name.includes('Malayalam'));
    
    // 2. If no Malayalam voice, fallback to English
    if (!preferredVoice) {
        console.warn('Malayalam voice not found. Falling back to English.');
        ttsStatus.textContent = "njn kure sremichu but malayalam voice Ai vech generate cheyyan pattunnilla";
        
        // Switch text to English
        utterance.text = "Merry Christmas Bindhu Chechi! Wishing you endless joy and peace.";
        
        // Find an English voice
        preferredVoice = voices.find(voice => voice.name.includes('Female') || voice.name.includes('Google US English') || voice.name.includes('Samantha') || voice.lang.includes('en'));
    }

    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

    utterance.rate = 0.9; 
    utterance.pitch = 1.1; 

    // Pause background music
    if (backgroundSound) backgroundSound.pause();

    utterance.onend = () => {
        ttsStatus.textContent = "Message spoken! ✨";
        // Resume background music
        if (backgroundSound) backgroundSound.play();
    };
    
    utterance.onerror = (e) => {
        console.error("TTS Error:", e);
        ttsStatus.textContent = "Voice error. Please check volume.";
        if (backgroundSound) backgroundSound.play();
    };

    window.speechSynthesis.speak(utterance);
}

/**
 * 🧑‍🍳 Generates a custom Christmas recipe using Gemini LLM.
 */
async function generateRecipe() {
    const userPrompt = recipePromptInput.value.trim();
    if (!userPrompt) {
        recipeOutput.textContent = "Please enter an idea for the recipe!";
        return;
    }

    const systemPrompt = `You are Chef Gemini, a world-class festive chef. Create a unique, creative, and personalized Christmas recipe based on the user's request, ensuring it sounds fun and heartwarming. Structure the response clearly with a Title, Ingredients, Instructions, and a Chef's Note. Do not include any introductory or concluding sentences outside the recipe structure itself.`;
    const userQuery = `Create a Christmas recipe for the user based on this theme: "${userPrompt}"`;
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const maxRetries = 3;
    let currentRetry = 0;

    generateRecipeBtn.disabled = true;
    recipeLoader.style.display = 'block';
    recipeOutput.textContent = 'Cooking up Christmas magic...';

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    while (currentRetry < maxRetries) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }

            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error.message || "Unknown API Error");
            }

            const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate recipe. Try a different prompt!";
            
            recipeOutput.textContent = generatedText;
            generateRecipeBtn.disabled = false;
            recipeLoader.style.display = 'none';
            return; // Success

        } catch (error) {
            console.error('Recipe API error:', error);
            currentRetry++;
            if (currentRetry < maxRetries) {
                const delay = Math.pow(2, currentRetry) * 1000;
                recipeOutput.textContent = `Error: ${error.message}. Retrying in ${delay / 1000}s...`;
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                 recipeOutput.textContent = `Failed: ${error.message}`;
            }
        }
    }
    // Final catch if loop finishes without success (though the else block above handles it)
    if (recipeOutput.textContent.startsWith('Cooking')) {
         recipeOutput.textContent = 'Failed to generate recipe. Please check console for details.';
    }
    generateRecipeBtn.disabled = false;
    recipeLoader.style.display = 'none';
}

// --- Core Functions ---

/**
 * 🎧 Initialize Howler.js for Background Music
 */
function initHowler() {
    // Placeholder: Replace 'xmas_jingle.mp3' with your actual file path
    backgroundSound = new Howl({
        src: ['xmas_jingle.mp3'], 
        loop: true,
        volume: 0.6,
        html5: true 
    });
}

/**
 * 🎅 Initialize Lottie Animation
 * Placeholder: Replace 'cute_xmas.json' with your actual Lottie JSON file
 */
function initLottie() {
    lottie.loadAnimation({
        container: document.getElementById('lottie-character'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'cute_xmas.json' 
    });
}

/**
 * ❄️ Initialize GSAP Snowfall
 */
function initGSAPSnow() {
    const snowfallContainer = document.getElementById('snowfall-container');
    const snowflakeCount = 40;
    
    for (let i = 0; i < snowflakeCount; i++) {
        const flake = document.createElement('div');
        flake.className = 'snowflake';
        snowfallContainer.appendChild(flake);
        
        const startX = Math.random() * window.innerWidth;
        const startY = -Math.random() * window.innerHeight * 2;
        
        gsap.set(flake, {
            x: startX,
            y: startY,
            scale: Math.random() * 0.7 + 0.3,
            opacity: Math.random() * 0.5 + 0.3
        });

        gsap.to(flake, {
            duration: Math.random() * 10 + 10,
            y: window.innerHeight * 1.5,
            repeat: -1,
            ease: "none",
            delay: -Math.random() * 15 
        });
        
        gsap.to(flake, {
            duration: Math.random() * 5 + 5,
            x: '+=50', 
            yoyo: true,
            repeat: -1,
            ease: "sine.easeInOut"
        });
    }
}

/**
 * 📚 Initialize Three.js Scene and 3D Book Model (Simulated)
 */
function initThreeJS() {
    // Scene, Camera, Renderer
    threeScene = new THREE.Scene();
    threeCamera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    threeRenderer.setSize(container.clientWidth, container.clientHeight);
    threeRenderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(threeRenderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    threeScene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    threeScene.add(directionalLight);

    // Camera Position
    threeCamera.position.set(0, 0.5, 5);
    threeCamera.lookAt(0, 0, 0);

    // --- 3D Book Components ---
    const coverMaterial = new THREE.MeshPhongMaterial({ color: 0x800000, shininess: 80 }); 
    const pageMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide }); 

    // 1. Front Cover (The part that opens)
    const coverGeometry = new THREE.BoxGeometry(bookWidth, bookHeight, bookDepth / 2);
    bookCover = new THREE.Mesh(coverGeometry, coverMaterial);
    bookCover.position.set(-bookWidth / 2, 0, 0); 
    
    // 2. Spine (The static back part)
    const spineGeometry = new THREE.BoxGeometry(bookWidth, bookHeight, bookDepth);
    bookSpine = new THREE.Mesh(spineGeometry, coverMaterial);
    bookSpine.position.set(0, 0, 0);
    
    // 3. Page (Simulating the first page)
    const pageGeometry = new THREE.PlaneGeometry(bookWidth - 0.1, bookHeight - 0.1);
    pageOne = new THREE.Mesh(pageGeometry, pageMaterial);
    pageOne.rotation.y = Math.PI / 2; 
    pageOne.position.set(-bookWidth / 2, 0, bookDepth / 4 + 0.01);
    
    // Group the cover and page for easier rotation
    const bookGroup = new THREE.Group();
    bookGroup.add(bookSpine);
    
    const coverPivot = new THREE.Group();
    coverPivot.position.set(bookWidth / 2, 0, 0);
    coverPivot.add(bookCover);
    
    const pagePivot = new THREE.Group();
    pagePivot.position.set(bookWidth / 2, 0, 0);
    pagePivot.add(pageOne);

    bookGroup.add(coverPivot);
    bookGroup.add(pagePivot);

    threeScene.add(bookGroup);
    bookGroup.rotation.y = -Math.PI / 2; 
    bookGroup.position.y = -1; 

    // Stored for GSAP manipulation
    window.bookGroup = bookGroup;
    window.coverPivot = coverPivot;
    window.pagePivot = pagePivot;

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        // Simple book rotation for effect
        if (window.bookGroup.rotation.y < 0.1) {
            window.bookGroup.rotation.y += 0.0005;
            if (window.bookGroup.rotation.y > 0.1) window.bookGroup.rotation.y = 0.1;
        }
        threeRenderer.render(threeScene, threeCamera);
    }

    animate();

    // Handle resize
    window.addEventListener('resize', onWindowResize);
    function onWindowResize() {
        threeCamera.aspect = container.clientWidth / container.clientHeight;
        threeCamera.updateProjectionMatrix();
        threeRenderer.setSize(container.clientWidth, container.clientHeight);
    }
}

/**
 * 🎬 Main experience sequence triggered by the start button
 */
function startExperience() {
    // 1. Start the music
    if (backgroundSound && !backgroundSound.playing()) {
        backgroundSound.play();
    }

    // 2. Hide landing screen and reveal 3D elements
    gsap.to(landingScreen, { 
        opacity: 0, 
        duration: 1, 
        ease: "power2.inOut",
        onComplete: () => landingScreen.style.display = 'none' 
    });

    // 3. GSAP Timeline for 3D Book Opening
    const bookTimeline = gsap.timeline({ delay: 1 });

    // Step A: Bring the book forward and slightly rotate it
    bookTimeline.to(window.bookGroup.rotation, { 
        duration: 2, 
        y: 0, 
        z: 0.1, 
        ease: "elastic.out(1, 0.5)" 
    }, 0); 
    bookTimeline.to(window.bookGroup.position, {
        duration: 1.5,
        y: 0,
        ease: "power1.out"
    }, 0.5);

    // Step B: Open the Book Cover (Animate the pivot rotation)
    bookTimeline.to(window.coverPivot.rotation, {
        duration: 2.5,
        y: Math.PI * 0.95, 
        ease: "power3.inOut"
    }, 2.5); 

    // Step C: Flip the First Page (Simulate a page turn)
    bookTimeline.to(window.pagePivot.rotation, {
        duration: 1.5,
        y: Math.PI * 0.9, 
        ease: "power1.inOut"
    }, 3.5); 

    // Step D: Show the Message Pages Container (HTML overlay)
    bookTimeline.call(() => {
        bookMessagesContainer.style.visibility = 'visible';
    }, [], 4.5);
    
    bookTimeline.to(bookMessagesContainer, {
        duration: 1,
        opacity: 1,
        scale: 1,
        ease: "back.out(1.7)"
    }, 4.5);
}

/**
 * ➡️ Handles the smooth transition to the next page.
 */
function handleNextPage() {
    if (currentPage >= totalPages) return;

    const oldPageId = `page-${currentPage}`;
    currentPage++;
    const newPageId = `page-${currentPage}`;

    const oldPage = document.getElementById(oldPageId);
    const newPage = document.getElementById(newPageId);

    // Slide out the old page and slide in the new page
    gsap.timeline()
        .to(oldPage, { duration: 0.5, x: '-100%', ease: "power2.in" })
        .call(() => {
            oldPage.classList.remove('active-page');
            newPage.classList.add('active-page');
        })
        .fromTo(newPage, 
            { x: '100%' }, 
            { duration: 0.5, x: '0%', ease: "power2.out" },
        '-=0.2'); 
}

/**
 * ❓ Reveals the answer to the puzzle on page 2.
 */
function revealPuzzleHint() {
    gsap.to(puzzleHint, { opacity: 1, duration: 0.5 });
    revealPuzzleBtn.disabled = true;
    revealPuzzleBtn.textContent = 'Hint Revealed!';
}

/**
 * 🎁 Shows the final gift box surprise
 */
function showGiftSurprise() {
    // 1. Hide the messages container completely before showing gift
    gsap.to(bookMessagesContainer, {
        opacity: 0,
        scale: 0.8,
        duration: 0.5,
        onComplete: () => bookMessagesContainer.style.visibility = 'hidden'
    });

    // 2. Animate the Gift Box Pop
    giftBox.style.visibility = 'visible';
    gsap.fromTo(giftBox, {
        y: 50,
        scale: 0.5,
        opacity: 0,
        rotation: -10
    }, {
        y: 0,
        scale: 1,
        opacity: 1,
        rotation: 0,
        duration: 1.2,
        ease: "elastic.out(1, 0.3)"
    });

    // Optional: Add a pulsating effect to the gift box
    gsap.to(giftBox, {
        scale: 1.05,
        repeat: -1,
        yoyo: true,
        duration: 1,
        ease: "sine.inOut"
    });
}

/**
 * 🥳 Handles the final click on the gift box
 */
function handleGiftBoxClick() {
     // Stop the pulsating animation
    gsap.killTweensOf(giftBox);
    
    // Shake the box and hide it
    gsap.to(giftBox, {
        duration: 0.5,
        x: 10,
        ease: "elastic.out(1, 0.3)",
        repeat: 3,
        yoyo: true,
        onComplete: () => {
            gsap.to(giftBox, { opacity: 0, duration: 0.5, onComplete: () => giftBox.style.visibility = 'hidden' });
        }
    });
    
    // Show the final message
    finalMessage.style.visibility = 'visible';
    gsap.fromTo(finalMessage, { 
        opacity: 0, 
        scale: 0.8 
    }, {
        opacity: 1, 
        scale: 1, 
        duration: 1, 
        delay: 0.5,
        ease: "back.out(1.7)"
    });
}
