import { algoliasearch } from 'algoliasearch';

// 1. ใส่กุญแจของ Algolia ครับ
const APP_ID = 'ED7B5NZJFK';
const ADMIN_KEY = 'adb412c4e88180aa6661c1daa55c9456'; 

const RAWG_API_KEY = '7aa58fd20b9d4e36856801ffd7e07961';

const client = algoliasearch(APP_ID, ADMIN_KEY);

// ฟังก์ชันหน่วงเวลาเพื่อป้องกัน RAWG บล็อกการเชื่อมต่อครับ
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function addMaxGamesToIndex() {
    console.log("🚚 สตาร์ทรถบรรทุกคันใหญ่ เตรียมสูบข้อมูลระดับ 10,000 เกมครับ...");
    
    let allRecords = [];
    // เปลี่ยนเป้าหมายเป็น 250 หน้าเพื่อให้เต็มโควต้าฟรีพอดีครับ
    const totalPages = 250; 

    try {
        for (let page = 1; page <= totalPages; page++) {
            console.log(`⏳ กำลังสูบข้อมูลหน้า ${page} จากทั้งหมด ${totalPages} หน้าครับ...`);
            
            // ใส่ exclude_additions=true เพื่อตัด DLC ทิ้งเหมือนเดิมครับ
            const response = await fetch(`https://api.rawg.io/api/games?key=${RAWG_API_KEY}&ordering=-added&page_size=40&page=${page}&exclude_additions=true`);
            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                console.log("⚠️ ข้อมูลหมดแล้วหรือโดนจำกัดการเข้าถึงครับ");
                break;
            }

            const records = data.results.map(game => ({
                objectID: game.id.toString(), 
                name: game.name,
                rating: game.rating,
                background_image: game.background_image,
                platforms: game.platforms ? game.platforms.map(p => p.platform.name) : []
            }));

            allRecords = allRecords.concat(records);
            
            // หยุดพักหายใจ 0.5 วินาทีในแต่ละหน้า เพื่อไม่ให้เซิร์ฟเวอร์ RAWG เตะเราออกครับ
            await delay(500); 
        }

        console.log(`📦 สูบข้อมูลเสร็จแล้ว ได้มาทั้งหมด ${allRecords.length} เกม เตรียมดันเข้าโกดัง Algolia ครับ...`);

        await client.saveObjects({ indexName: 'games', objects: allRecords });

        console.log("✅ ดันข้อมูล 10,000 เกมขึ้น Algolia สำเร็จเรียบร้อยแล้วครับ!");

    } catch (error) {
        console.error("❌ เกิดข้อผิดพลาดครับ:", error);
    }
}

addMaxGamesToIndex();