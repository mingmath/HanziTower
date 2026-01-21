// --- 第二國度 (Index 1) ---
(function() {
    window.LevelCache = window.LevelCache || {};

    const levels = [
        // 這裡應該是第 101 關 (id 顯示為 101，但 array index 是 0)
        { 
            id: 101, 
            chars: "測試範例關卡", 
            sols: ["測試", "範例", "關卡"], 
            layout: [2, 2, 2], 
            details: {} 
        }
        // ... 接續直到 200 關 ...
    ];

    // Key 為 1 (代表第2國度)
    window.LevelCache[1] = levels;
})();