const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const gameResults = document.getElementById('gameResults');

const paginationControls = document.getElementById('paginationControls');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const pageInfo = document.getElementById('pageInfo');

const gameModal = document.getElementById('gameModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalContent = document.getElementById('modalContent');

const ALGOLIA_APP_ID = 'ED7B5NZJFK';
const ALGOLIA_SEARCH_KEY = '5ace03c7db0f754090be15e31b3ebd89'; 
const ALGOLIA_INDEX_NAME = 'games';
const RAWG_API_KEY = '7aa58fd20b9d4e36856801ffd7e07961'; 

let currentPage = 1;
let currentKeyword = '';
let currentMode = 'algolia'; 
let totalPages = 1;

const gameDictionary = {
    "gta": "grand theft auto",
    "cod": "call of duty",
    "re": "resident evil",
    "rdr": "red dead redemption",
    "มาริโอ้": "super mario",
    "เดอะซิมส์": "the sims"
};

const storeInfo = {
    1: { name: 'Steam', color: 'bg-[#171a21] hover:bg-gray-700', icon: 'fab fa-steam' },
    2: { name: 'Xbox', color: 'bg-[#107C10] hover:bg-green-700', icon: 'fab fa-xbox' },
    3: { name: 'PlayStation', color: 'bg-[#00439C] hover:bg-blue-800', icon: 'fab fa-playstation' },
    4: { name: 'App Store', color: 'bg-blue-500 hover:bg-blue-600', icon: 'fab fa-apple' },
    5: { name: 'GOG', color: 'bg-purple-600 hover:bg-purple-700', icon: 'fas fa-shopping-basket' },
    6: { name: 'Nintendo', color: 'bg-[#E60012] hover:bg-red-700', icon: 'fab fa-nintendo-switch' },
    8: { name: 'Google Play', color: 'bg-teal-500 hover:bg-teal-600', icon: 'fab fa-google-play' },
    11: { name: 'Epic Games', color: 'bg-gray-800 hover:bg-gray-900', icon: 'fas fa-store' }
};

function fixThaiKeyboard(text) {
    const thaiKeys = "ๆไำพะัีรนยบลฟหกดเ้่าสวงผปแอิืทมใฝ";
    const engKeys = "qwertyuiop[]asdfghjkl;'zxcvbnm,./";
    let fixedText = "";
    for (let char of text) {
        let index = thaiKeys.indexOf(char);
        fixedText += index !== -1 ? engKeys[index] : char;
    }
    return fixedText;
}

// ---------------- เพิ่มฟังก์ชันแปลภาษา ----------------
async function translateToThai(text) {
    if (!text) return 'ไม่มีคำอธิบายเกม';
    
    try {
        // ใช้บริการแปลฟรีของ Google
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=th&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        // ข้อมูลที่ได้มาจะเป็นก้อนๆ เราต้องเอามาต่อกันครับ
        const translatedText = data[0].map(item => item[0]).join('');
        return translatedText;
    } catch (error) {
        console.error("แปลภาษาไม่สำเร็จ:", error);
        // ถ้าแปลพัง ให้แสดงภาษาอังกฤษของเดิมไปก่อนครับ
        return text; 
    }
}

// ---------------- ระบบ Popup ----------------

window.openGameModal = async function(gameId) {
    gameModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; 
    modalContent.innerHTML = '<div class="p-20 text-center text-xl text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>กำลังดึงข้อมูลและแปลภาษา...</div>';

    try {
        const gameRes = await fetch(`https://api.rawg.io/api/games/${gameId}?key=${RAWG_API_KEY}`);
        const gameData = await gameRes.json();

        const dlcRes = await fetch(`https://api.rawg.io/api/games/${gameId}/additions?key=${RAWG_API_KEY}`);
        const dlcData = await dlcRes.json();

        const stores = await fetch(`https://api.rawg.io/api/games/${gameId}/stores?key=${RAWG_API_KEY}`).then(r => r.json());
        let storeButtons = '';
        if (stores.results && stores.results.length > 0) {
            stores.results.forEach(store => { 
                const info = storeInfo[store.store_id] || { name: 'Store', color: 'bg-gray-600', icon: 'fas fa-shopping-cart' };
                storeButtons += `<a href="${store.url}" target="_blank" class="px-4 py-2 ${info.color} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"><i class="${info.icon} mr-2"></i>${info.name}</a>`;
            });
        }

        // --- จุดที่อัปเกรด: เรียกใช้งานฟังก์ชันแปลภาษา ---
        // เราใช้ description_raw เพราะมันเป็นข้อความล้วน ไม่มีโค้ด HTML ปน ทำให้แปลได้แม่นยำกว่าครับ
        const englishDescription = gameData.description_raw || '';
        let finalDescription = 'ไม่มีคำอธิบายเกม';
        
        if (englishDescription) {
            finalDescription = await translateToThai(englishDescription);
            // แปลงการเว้นบรรทัด (Enter) ให้เป็นโค้ด <br> เพื่อให้ขึ้นบรรทัดใหม่สวยงามครับ
            finalDescription = finalDescription.replace(/\n/g, '<br><br>');
        }

        let dlcSection = '';
        if (dlcData.results && dlcData.results.length > 0) {
            dlcSection = `<h3 class="text-2xl font-bold mt-10 mb-4 text-purple-400 border-b border-gray-700 pb-2">📦 ส่วนเสริม (DLC & Additions)</h3>
                          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">`;
            dlcData.results.slice(0, 8).forEach(dlc => {
                const dlcImg = dlc.background_image || 'https://placehold.co/300x200/1f2937/white?text=No+Image';
                dlcSection += `
                    <div class="bg-gray-700 rounded-xl overflow-hidden shadow-md">
                        <img src="${dlcImg}" class="w-full h-24 object-cover" alt="DLC">
                        <div class="p-3">
                            <p class="text-sm font-semibold truncate" title="${dlc.name}">${dlc.name}</p>
                        </div>
                    </div>`;
            });
            dlcSection += `</div>`;
        }

        modalContent.innerHTML = `
            <div>
                <div class="relative h-64 md:h-96 w-full">
                    <img src="${gameData.background_image || 'https://placehold.co/1200x500/1f2937/white?text=No+Image'}" class="w-full h-full object-cover rounded-t-3xl opacity-60">
                    <div class="absolute bottom-0 left-0 w-full p-6 md:p-10 bg-gradient-to-t from-gray-800 to-transparent">
                        <h2 class="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">${gameData.name}</h2>
                        <p class="text-gray-300 mt-2 font-medium">วางจำหน่าย: ${gameData.released || 'ไม่ระบุ'} • ผู้พัฒนา: ${gameData.developers ? gameData.developers.map(d=>d.name).join(', ') : 'ไม่ระบุ'}</p>
                    </div>
                </div>
                <div class="p-6 md:p-10 pt-4">
                    <div class="flex flex-wrap gap-3 mb-6">
                        ${storeButtons || '<span class="text-gray-400">ไม่พบลิงก์ร้านค้า</span>'}
                    </div>
                    <div class="text-gray-300 leading-relaxed space-y-4">
                        <h3 class="text-xl font-bold text-white">เกี่ยวกับเกมนี้</h3>
                        ${finalDescription}
                    </div>
                    ${dlcSection}
                </div>
            </div>
        `;
    } catch (error) {
        modalContent.innerHTML = '<div class="p-20 text-center text-red-400">เกิดข้อผิดพลาดในการดึงข้อมูลรายละเอียดเกมครับ</div>';
    }
}

closeModalBtn.addEventListener('click', () => {
    gameModal.classList.add('hidden');
    document.body.style.overflow = 'auto'; 
});

gameModal.addEventListener('click', (e) => {
    if (e.target === gameModal) {
        gameModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
});

async function fetchGameStores(gameId) {
    try {
        const response = await fetch(`https://api.rawg.io/api/games/${gameId}/stores?key=${RAWG_API_KEY}`);
        const data = await response.json();
        return data.results;
    } catch (error) {
        return [];
    }
}

async function renderGameCards(games, isAlgolia = true) {
    const gameCardsPromises = games.map(async (game) => {
        const gameId = isAlgolia ? game.objectID : game.id;
        const name = game.name;
        const rating = game.rating;
        const imageUrl = game.background_image || 'https://placehold.co/600x400/1f2937/white?text=No+Image';
        
        let platformList = 'ไม่ระบุแพลตฟอร์ม';
        if (isAlgolia && game.platforms) {
            platformList = game.platforms.slice(0, 3).join(', ');
        } else if (!isAlgolia && game.platforms) {
            platformList = game.platforms.map(p => p.platform.name).slice(0, 3).join(', ');
        }

        return `
            <div onclick="openGameModal('${gameId}')" class="bg-gray-800 rounded-2xl flex flex-col items-center hover:scale-105 transition-transform border border-gray-700 shadow-lg cursor-pointer overflow-hidden group">
                <div class="relative w-full h-48">
                    <img src="${imageUrl}" alt="ปกเกม" class="w-full h-full object-cover">
                    <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span class="text-white font-bold bg-blue-600 px-4 py-2 rounded-full">ดูข้อมูลเกมนี้</span>
                    </div>
                </div>
                <div class="p-5 w-full flex flex-col items-center">
                    <h3 class="text-xl font-bold text-white text-center mb-2 line-clamp-1">${name}</h3>
                    <span class="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-semibold text-center mb-2 truncate max-w-full">
                        🎮 ${platformList}
                    </span>
                    <span class="text-yellow-400 text-sm font-bold">⭐ คะแนน: ${rating} / 5</span>
                </div>
            </div>
        `;
    });

    const gameCards = await Promise.all(gameCardsPromises);
    gameResults.innerHTML = gameCards.join('');
}

function updatePaginationUI() {
    if (totalPages <= 1) {
        paginationControls.classList.add('hidden');
        paginationControls.classList.remove('flex');
    } else {
        paginationControls.classList.remove('hidden');
        paginationControls.classList.add('flex');
        pageInfo.textContent = `หน้า ${currentPage} จาก ${totalPages}`;
        
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
        
        prevPageBtn.className = `px-4 py-2 rounded-lg font-semibold transition-colors ${currentPage === 1 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-600 hover:bg-gray-500 text-white'}`;
        nextPageBtn.className = `px-4 py-2 rounded-lg font-semibold transition-colors ${currentPage === totalPages ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`;
    }
}

async function executeSearch(keyword, page) {
    gameResults.innerHTML = '<p class="text-gray-400 col-span-full text-center text-lg"><i class="fas fa-spinner fa-spin mr-2"></i>กำลังค้นหาเกม...</p>';
    paginationControls.classList.add('hidden'); 

    try {
        if (currentMode === 'algolia') {
            const algoliaPage = page - 1; 
            const algoliaResponse = await fetch(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX_NAME}/query`, {
                method: 'POST',
                headers: {
                    'X-Algolia-Application-Id': ALGOLIA_APP_ID,
                    'X-Algolia-API-Key': ALGOLIA_SEARCH_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    query: keyword,
                    page: algoliaPage,
                    hitsPerPage: 21 
                })
            });
            const algoliaData = await algoliaResponse.json();

            if (algoliaData.hits && algoliaData.hits.length > 0) {
                totalPages = algoliaData.nbPages; 
                await renderGameCards(algoliaData.hits, true);
                updatePaginationUI();
                return; 
            } else if (page === 1) {
                currentMode = 'rawg';
            }
        }

        if (currentMode === 'rawg') {
            const rawgResponse = await fetch(`https://api.rawg.io/api/games?search=${keyword}&key=${RAWG_API_KEY}&ordering=-added&page=${page}&page_size=21&exclude_additions=true`);
            const rawgData = await rawgResponse.json();

            if (rawgData.results && rawgData.results.length > 0) {
                totalPages = Math.ceil(rawgData.count / 21);
                await renderGameCards(rawgData.results, false);
                updatePaginationUI();
            } else {
                gameResults.innerHTML = '<p class="text-red-400 col-span-full text-center text-lg">ไม่พบข้อมูลเกมนี้ในจักรวาล</p>';
            }
        }
    } catch (error) {
        gameResults.innerHTML = '<p class="text-red-500 col-span-full text-center">เกิดข้อผิดพลาดในการเชื่อมต่อ</p>';
    }
}

searchButton.addEventListener('click', () => {
    let rawKeyword = searchInput.value.trim().toLowerCase();
    if (!rawKeyword) return;

    let finalKeyword = rawKeyword;
    if (gameDictionary[rawKeyword]) {
        finalKeyword = gameDictionary[rawKeyword];
    } else if (/[ก-๙]/.test(rawKeyword)) {
        finalKeyword = fixThaiKeyboard(rawKeyword);
    }

    currentKeyword = finalKeyword;
    currentPage = 1;
    currentMode = 'algolia'; 
    executeSearch(currentKeyword, currentPage);
});

searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchButton.click(); });

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        executeSearch(currentKeyword, currentPage);
        document.getElementById('searchInput').scrollIntoView({ behavior: 'smooth' }); 
    }
});

nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        executeSearch(currentKeyword, currentPage);
        document.getElementById('searchInput').scrollIntoView({ behavior: 'smooth' }); 
    }
});
window.openGameModal = async function(gameId) {
    gameModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; 
    modalContent.innerHTML = '<div class="p-20 text-center text-xl text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>กำลังดึงข้อมูลและแปลภาษา...</div>';

    try {
        const gameRes = await fetch(`https://api.rawg.io/api/games/${gameId}?key=${RAWG_API_KEY}`);
        const gameData = await gameRes.json();

        // เพิ่ม &page_size=40 ตรงนี้เพื่อให้ดึง DLC มาเยอะๆ ครับ
        const dlcRes = await fetch(`https://api.rawg.io/api/games/${gameId}/additions?key=${RAWG_API_KEY}&page_size=40`);
        const dlcData = await dlcRes.json();

        const stores = await fetch(`https://api.rawg.io/api/games/${gameId}/stores?key=${RAWG_API_KEY}`).then(r => r.json());
        let storeButtons = '';
        if (stores.results && stores.results.length > 0) {
            stores.results.forEach(store => { 
                const info = storeInfo[store.store_id] || { name: 'Store', color: 'bg-gray-600', icon: 'fas fa-shopping-cart' };
                storeButtons += `<a href="${store.url}" target="_blank" class="px-4 py-2 ${info.color} text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"><i class="${info.icon} mr-2"></i>${info.name}</a>`;
            });
        }

        const englishDescription = gameData.description_raw || '';
        let finalDescription = 'ไม่มีคำอธิบายเกม';
        
        if (englishDescription) {
            finalDescription = await translateToThai(englishDescription);
            finalDescription = finalDescription.replace(/\n/g, '<br><br>');
        }

        // --- จุดที่อัปเกรด: เปลี่ยนเป็น Scroll แนวนอน ---
        let dlcSection = '';
        if (dlcData.results && dlcData.results.length > 0) {
            // ใช้ flex และ overflow-x-auto เพื่อให้เลื่อนได้ครับ พร้อมกับ snap-x เพื่อให้มันดูดติดขอบเวลาเลื่อน
            dlcSection = `<h3 class="text-2xl font-bold mt-10 mb-4 text-purple-400 border-b border-gray-700 pb-2">📦 ส่วนเสริม (DLC & Additions)</h3>
                          <div class="flex overflow-x-auto gap-4 pb-4 snap-x">`;
            
            // เอา .slice ออก เพื่อให้โชว์ทุกอันที่ดึงมาครับ
            dlcData.results.forEach(dlc => {
                const dlcImg = dlc.background_image || 'https://placehold.co/300x200/1f2937/white?text=No+Image';
                dlcSection += `
                    <div class="bg-gray-700 rounded-xl overflow-hidden shadow-md flex-none w-40 sm:w-48 snap-start">
                        <img src="${dlcImg}" class="w-full h-24 object-cover" alt="DLC">
                        <div class="p-3">
                            <p class="text-sm font-semibold truncate text-white" title="${dlc.name}">${dlc.name}</p>
                        </div>
                    </div>`;
            });
            dlcSection += `</div>`;
        }

        modalContent.innerHTML = `
            <div>
                <div class="relative h-64 md:h-96 w-full">
                    <img src="${gameData.background_image || 'https://placehold.co/1200x500/1f2937/white?text=No+Image'}" class="w-full h-full object-cover rounded-t-3xl opacity-60">
                    <div class="absolute bottom-0 left-0 w-full p-6 md:p-10 bg-gradient-to-t from-gray-800 to-transparent">
                        <h2 class="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">${gameData.name}</h2>
                        <p class="text-gray-300 mt-2 font-medium">วางจำหน่าย: ${gameData.released || 'ไม่ระบุ'} • ผู้พัฒนา: ${gameData.developers ? gameData.developers.map(d=>d.name).join(', ') : 'ไม่ระบุ'}</p>
                    </div>
                </div>
                <div class="p-6 md:p-10 pt-4">
                    <div class="flex flex-wrap gap-3 mb-6">
                        ${storeButtons || '<span class="text-gray-400">ไม่พบลิงก์ร้านค้า</span>'}
                    </div>
                    <div class="text-gray-300 leading-relaxed space-y-4">
                        <h3 class="text-xl font-bold text-white">เกี่ยวกับเกมนี้</h3>
                        ${finalDescription}
                    </div>
                    ${dlcSection}
                </div>
            </div>
        `;
    } catch (error) {
        modalContent.innerHTML = '<div class="p-20 text-center text-red-400">เกิดข้อผิดพลาดในการดึงข้อมูลรายละเอียดเกมครับ</div>';
    }
}