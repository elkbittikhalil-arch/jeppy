// حط المفتاح الجديد اللي بان فآخر تصويرة هنا
const GEMINI_API_KEY = "AIzaSyDeFimIlvEUueWaUJPFEd2p4yb6Mks75yc"; 

async function sendMessage() {
    const inputField = document.querySelector('#user-input') || document.querySelector('input[type="text"]');
    const userInput = inputField.value;
    if (!userInput) return;

    // الرابط الصحيح لنسخة v1beta
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userInput }] }],
                // هادي كتخلي Jeppy يجاوب بطريقة غامضة
                systemInstruction: {
                    parts: [{ text: "You are Jeppy, a mysterious star-faced creature. Be scary, cryptic, and use short sentences." }]
                }
            })
        });

        const data = await response.json();
        
        if (data.candidates) {
            const reply = data.candidates[0].content.parts[0].text;
            
            // 1. عرض الرد في الشاشة
            document.querySelector('.chat-display').innerHTML += `<p>Jeppy: ${reply}</p>`;
            
            // 2. تشغيل الصوت الغريب (Scary Voice)
            speak(reply);
        }
    } catch (e) {
        console.error("API failed:", e);
    }
}

function speak(message) {
    const speech = new SpeechSynthesisUtterance(message);
    speech.pitch = 0.3; // صوت عميق جداً ومرعب
    speech.rate = 0.6;  // سرعة بطيئة
    window.speechSynthesis.speak(speech);
}
