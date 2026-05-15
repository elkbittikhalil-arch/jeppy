// حط المفتاح ديالك هنا
const GEMINI_API_KEY = AIzaSyDeFImILvEUueWaUJPFEd2p4yb6Mks75yc; 

async function sendMessage() {
    const userInput = document.getElementById('user-input').value; // تأكد من ID ديال input
    if (!userInput) return;

    // الرابط الصحيح لـ Gemini 1.5 Flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: userInput }]
                }],
                // هادي هي تعليمات النظام باش يولي Jeppy كيهضر بطريقة مرعبة
                systemInstruction: {
                    parts: [{ text: "You are Jeppy, a dark, mysterious, and scary entity. Speak in short, cryptic sentences." }]
                }
            })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const aiResponse = data.candidates[0].content.parts[0].text;
            
            // عرض التيكست فالموقع
            displayMessage(aiResponse, 'jeppy');
            
            // تشغيل الصوت المرعب
            speak(aiResponse);
        } else {
            console.error("Gemini Error:", data);
        }

    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

// دالة الصوت (Scary Voice)
function speak(text) {
    const speech = new SpeechSynthesisUtterance(text);
    speech.pitch = 0.4; // صوت غليظ
    speech.rate = 0.8;  // صوت بطيء
    window.speechSynthesis.speak(speech);
}
