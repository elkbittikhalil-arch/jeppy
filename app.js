const GEMINI_API_KEY = "AIzaSyDeFimIlvEUueWaUJPFEd2p4yb6Mks75yc"; // المفتاح اللي فالتصويرة

async function sendMessage() {
    const input = document.querySelector('input'); 
    const message = input.value;
    if (!message) return;

    // عرض رسالتك
    addMessageToChat(message, 'user');
    input.value = '';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: message }] }],
                systemInstruction: { parts: [{ text: "You are Jeppy, a creepy, mysterious star-faced entity. Reply in short, scary Darija or English." }] }
            })
        });

        const data = await response.json();
        const reply = data.candidates[0].content.parts[0].text;

        // عرض رد Jeppy
        addMessageToChat(reply, 'jeppy');
        
        // تشغيل الصوت المرعب
        speak(reply);

    } catch (error) {
        console.error("خطأ في الاتصال:", error);
    }
}

// دالة الصوت (Free & Scary)
function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 0.4; // صوت غليظ
    utterance.rate = 0.7;  // بطيء
    window.speechSynthesis.speak(utterance);
}

function addMessageToChat(text, sender) {
    const chatBox = document.querySelector('.chat-display'); // تأكد من اسم الـ class عندك
    chatBox.innerHTML += `<div class="${sender}">${text}</div>`;
}
