// --- 核心資料管理 data_core.js ---

// 全域快取：用來存放動態載入的關卡資料
window.LevelCache = {};

const RealmNames = [
    "始源之境", "墨香森林", "筆塚荒原", "硯池幽谷", "竹簡迷宮",
    "經卷神殿", "碑林古道", "活字工坊", "辭海汪洋", "詩韻雲端",
    "金石遺跡", "甲骨禁地", "隸書平原", "楷模山脈", "狂草荒漠",
    "行雲流水", "銘文深淵", "典籍天梯", "聖賢書院", "真理之塔"
];

const Data = {
    coins: 0, 
    keys: 3, 
    unlockedLevel: 0, 
    lastCheckIn: null, 
    playerLevel: 1, 
    musicOn: true,
    
    load() {
        const saved = localStorage.getItem('zyramid_save_v5');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.coins = data.coins ?? 0;
                this.keys = data.keys ?? 3;
                this.unlockedLevel = data.unlockedLevel ?? 0;
                this.lastCheckIn = data.lastCheckIn;
                this.playerLevel = Math.floor(this.unlockedLevel / 5) + 1;
            } catch(e) { console.error("Save load failed", e); }
        }
    },
    
    save() {
        localStorage.setItem('zyramid_save_v5', JSON.stringify({
            coins: this.coins,
            keys: this.keys,
            unlockedLevel: this.unlockedLevel,
            lastCheckIn: this.lastCheckIn
        }));
    }
};