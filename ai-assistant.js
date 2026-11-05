/**
 * TK-117 Platforması - Gemini AI Asistant Modulu
 * Müəllif: Elşad Dəmirov
 * Xüsusiyyətlər: Ayrı JS faylı, Canlı Baza Oxuması, Çevik Sual-Cavab və Float Button Nəzarəti
 */

// API Açarını saxlayırıq (Admin Paneldən girilən key)
let GEMINI_API_KEY = localStorage.getItem('tk117_gemini_api_key') || "";

// 1. AI Düyməsi və Yazışma Pəncərəsinin Açılıb-Bağlanması
function toggleAI() {
    let aiWin = document.getElementById('aiWindow');
    let aiBtn = document.getElementById('aiFloatBtn');
    if (!aiWin) return;
    
    if (aiWin.style.display === 'flex') {
        aiWin.style.display = 'none';
        if (aiBtn) aiBtn.innerText = "✨";
    } else {
        aiWin.style.display = 'flex';
        if (aiBtn) aiBtn.innerText = "✖";
    }
}

// 2. Rejim Keçidləri (Sərbəst / Düyməli Çat)
function startAiFreeMode() {
    document.getElementById('aiModeSelection').style.display = 'none';
    document.getElementById('aiFreeChat').style.display = 'flex';
    document.getElementById('aiButtonChat').style.display = 'none';
}

function startAiButtonMode() {
    document.getElementById('aiModeSelection').style.display = 'none';
    document.getElementById('aiFreeChat').style.display = 'none';
    document.getElementById('aiButtonChat').style.display = 'flex';
    renderAiButtons();
}

function backToAiSelection() {
    document.getElementById('aiModeSelection').style.display = 'flex';
    document.getElementById('aiFreeChat').style.display = 'none';
    document.getElementById('aiButtonChat').style.display = 'none';
}

// 3. Sərbəst Çat - Gemini AI Məntiqi və Canlı Baza Oxunması
async function sendAIMessage() {
    let inp = document.getElementById('aiInput');
    let text = inp.value.trim();
    if (!text) return;

    let container = document.getElementById('aiMessages');
    container.innerHTML += `<div class="ai-msg-bubble ai-msg-user">${escapeHtml(text)}</div>`;
    inp.value = "";
    container.scrollTop = container.scrollHeight;

    // Yüklənir (Typing) animasiyası
    let typingId = "ai-type-" + Date.now();
    container.innerHTML += `
        <div id="${typingId}" class="ai-msg-bubble ai-msg-bot">
            <div class="ai-typing"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>
        </div>`;
    container.scrollTop = container.scrollHeight;

    // API Açarı daxil edilməyibsə xəbərdarlıq et
    if (!GEMINI_API_KEY) {
        setTimeout(() => {
            let tEl = document.getElementById(typingId);
            if (tEl) tEl.remove();
            container.innerHTML += `<div class="ai-msg-bubble ai-msg-bot">⚠️ API açarı daxil edilməyib. Lütfən Admin Paneldən (Şifrə: 2701) Gemini API açarını əlavə edin.</div>`;
            container.scrollTop = container.scrollHeight;
        }, 600);
        return;
    }

    // SAYTIN CANLI VERİLƏNLƏR BAZASINI MƏTNƏ ÇEVİRİRİK
    let contextStr = `
    TƏLƏBƏ VƏ MÜƏLLİM BAZASI:
    - Fuad Qurbanov: TK-117 qrupunun fənn müəllimidir. BDU Tətbiqi Riyaziyyat və Kibernetika fakültəsinin məzunudur, 1984-cü ildən BDU-da çalışır.
    - Elşad Dəmirov: TK-117 tələbəsi, bu platformanın admini və layihənin yaradıcısıdır. C++, Python, HTML/CSS/JS və neyron şəbəkə inteqrasiyaları üzrə işləyir.
    - İlkin Bəşirzadə: TK-117 tələbəsi və Baş admindir.
    - Zümrüd Məmmədova: Ekspert (C++).
    - Aytac Aliyeva: Ekspert (Python).
    
    CARİ TƏLƏBƏ İMKANLARI VƏ STATİSTİKASI:
    `;

    if (typeof students !== 'undefined' && students.length > 0) {
        let sortedSt = [...students];
        if (typeof calcTotalFor === 'function') calcTotalFor(sortedSt);
        sortedSt.sort((a, b) => (b.overallTotal || 0) - (a.overallTotal || 0));
        
        sortedSt.forEach(s => {
            let pyTotal = s.pyTotal || 0;
            let cppTotal = s.cppTotal || 0;
            let overall = s.overallTotal || (pyTotal + cppTotal);
            contextStr += `- ${s.name} | Ümumi Bal: ${overall} (Python: ${pyTotal}, C++: ${cppTotal}) | Qayıb: ${s.absences || 0}/7\n`;
        });
    }

    if (typeof lecturesData !== 'undefined' && lecturesData.length > 0) {
        contextStr += `\nMÜHAZİRƏLƏR: ` + lecturesData.map(l => l.title).join(', ');
    }

    let systemInstruction = `Sən TK-117 proqramlaşdırma portalının ağıllı Süni İntellekt Asistanısan.
Aşağıdakı canlı verilənlər bazasından istifadə edərək istifadəçinin verdiyi İXTİYARİ suallara anında və məntiqi cavab ver.
İstifadəçi bazadakı istənilən şəxs (Elşad Dəmirov, Fuad Qurbanov və s.), reytinqlər, ballar, qayıblar və ya dərslər haqqında nə soruşsa, verilənləri analiz et və insan dilində cavabla.
Qalın yazmaq üçün HTML <b> etiketindən, yeni sətir üçün <br> etiketindən istifadə et.

CANLI BAZA:
${contextStr}`;

    try {
        let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemInstruction }] },
                contents: [{ parts: [{ text: text }] }]
            })
        });

        let data = await response.json();
        let tEl = document.getElementById(typingId);
        if (tEl) tEl.remove();

        if (data.candidates && data.candidates.length > 0) {
            let aiText = data.candidates[0].content.parts[0].text;
            aiText = aiText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
            container.innerHTML += `<div class="ai-msg-bubble ai-msg-bot">${aiText}</div>`;
        } else {
            container.innerHTML += `<div class="ai-msg-bubble ai-msg-bot">Üzr istəyirəm, məlumatı emal etmək mümkün olmadı.</div>`;
        }
    } catch (error) {
        let tEl = document.getElementById(typingId);
        if (tEl) tEl.remove();
        container.innerHTML += `<div class="ai-msg-bubble ai-msg-bot">Şəbəkə xətası baş verdi və ya API açarı yalnışdır.</div>`;
    }
    container.scrollTop = container.scrollHeight;
}

// 4. Düyməli Çat Rejimi (Sürətli Seçimlər Üçün)
function renderAiButtons() {
    let container = document.getElementById('aiBtnMessages');
    let controls = document.getElementById('aiBtnControls');
    
    container.innerHTML = `<div class="ai-msg-bubble ai-msg-bot">Sürətli cavab almaq üçün aşağıdakı düymələrdən birini seçin:</div>`;
    controls.innerHTML = `
        <button class="btn-tools" onclick="handleAiButtonClick('lider')">🏆 Qrup Lideri</button>
        <button class="btn-tools" onclick="handleAiButtonClick('elsad')">👨‍💻 Elşad Dəmirov</button>
        <button class="btn-tools" onclick="handleAiButtonClick('muellim')">👨‍🏫 Müəllim Haqqında</button>
    `;
}

function handleAiButtonClick(type) {
    let container = document.getElementById('aiBtnMessages');
    let userText = "", botReply = "";

    if (type === 'lider') {
        userText = "Qrup lideri kimdir?";
        if (typeof students !== 'undefined' && students.length > 0) {
            let sorted = [...students];
            if (typeof calcTotalFor === 'function') calcTotalFor(sorted);
            sorted.sort((a, b) => (b.overallTotal || 0) - (a.overallTotal || 0));
            botReply = `Cari reytinqə görə qrupun 1-ci yeri: <b>${sorted[0].name}</b> (${sorted[0].overallTotal || 0} bal).`;
        } else { botReply = "Məlumat bazası yüklənməyib."; }
    } else if (type === 'elsad') {
        userText = "Elşad Dəmirov kimdir?";
        botReply = "<b>Elşad Dəmirov</b> TK-117 qrupunun tələbəsi, bu platformanın admini və layihənin tərtibatçısıdır.";
    } else if (type === 'muellim') {
        userText = "Fuad Qurbanov kimdir?";
        botReply = "<b>Fuad Qurbanov</b> fənn müəllimimizdir. 1984-cü ildən BDU-da çalışır.";
    }

    container.innerHTML += `<div class="ai-msg-bubble ai-msg-user">${userText}</div><div class="ai-msg-bubble ai-msg-bot">${botReply}</div>`;
    container.scrollTop = container.scrollHeight;
}

// Mətndəki xüsusi HTML simvollarını təmizləmək üçün
function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
