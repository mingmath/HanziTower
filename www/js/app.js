// --- 錯誤捕捉 ---
window.onerror = function(msg, url, line) {
    const el = document.getElementById('error-console');
    if (el) { el.style.display = 'block'; el.innerHTML += `錯誤: ${msg}<br>行數: ${line}<br>`; }
    return false;
};

// --- Google H5 Ads ---
let wasMusicPlaying = false; 
const AdController = {
    isAdActive: false,
    init() { window.adConfig = function(o) { o.preloadAdBreaks = 'on'; o.sound = 'on'; o.onReady = () => { console.log("H5 Ads Ready"); }; }; },
    showLoading() { document.getElementById('ad-loading-overlay').style.display = 'flex'; },
    hideLoading() { document.getElementById('ad-loading-overlay').style.display = 'none'; },
    beforeAd() { AdController.hideLoading(); AdController.isAdActive = true; const audio = document.getElementById('bg-music'); if (audio && !audio.paused) { wasMusicPlaying = true; audio.pause(); } else { wasMusicPlaying = false; } },
    afterAd() { AdController.isAdActive = false; AdController.hideLoading(); const audio = document.getElementById('bg-music'); if (wasMusicPlaying && audio) { audio.play().catch(()=>{}); } },
    showRewardAd(onSuccess) { this.showLoading(); if (typeof adBreak !== 'function') { console.warn("Ads Mock"); this.hideLoading(); App.watchAdMock(onSuccess); return; } AdController.isAdActive = false; adBreak({ type: 'reward', name: 'get_candle', beforeAd: AdController.beforeAd, afterAd: AdController.afterAd, beforeReward: (showAdFn) => { showAdFn(); }, adDismissed: () => { AdController.hideLoading(); Modal.show("提示", "必須看完廣告才能獲得獎勵！"); }, adViewed: () => { AdController.hideLoading(); if (onSuccess) onSuccess(); } }); setTimeout(() => { if (!AdController.isAdActive) AdController.hideLoading(); }, 3000); },
    showInterstitialAd(nextAction) { this.showLoading(); let hasProceeded = false; const safeNext = () => { if (hasProceeded) return; hasProceeded = true; AdController.hideLoading(); if (nextAction) nextAction(); }; if (typeof adBreak !== 'function') { safeNext(); return; } AdController.isAdActive = false; try { adBreak({ type: 'next', name: 'level_complete', beforeAd: AdController.beforeAd, afterAd: AdController.afterAd, adBreakDone: () => { safeNext(); } }); } catch (e) { safeNext(); } setTimeout(() => { if (!AdController.isAdActive && !hasProceeded) safeNext(); }, 1500); }
};
AdController.init();

// --- 特效系統 (彩帶) ---
const ConfettiSystem = {
    spawn() {
        const container = document.getElementById('confetti-container');
        const colors = ['#ef4444', '#fbbf24', '#3b82f6', '#10b981', '#a855f7'];
        for (let i = 0; i < 50; i++) {
            const conf = document.createElement('div');
            conf.className = 'confetti';
            conf.style.left = Math.random() * 100 + 'vw';
            conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            conf.style.animationDuration = (Math.random() * 2 + 2) + 's'; // 2-4s
            conf.style.transform = `rotate(${Math.random()*360}deg)`;
            container.appendChild(conf);
            // 動畫結束後移除
            setTimeout(() => { conf.remove(); }, 4000);
        }
    }
};

// --- Modal 工具 (增強版) ---
const Modal = {
    // 一般視窗
    show(title, content, btnText="確定", icon="📜", onConfirm=null) {
        this.openBase(title, content, icon);
        this.setSingleAction(btnText, onConfirm);
    },
    // 雙按鈕視窗 (無特效)
    show2(title, msg) {
        this.openBase(title, msg, "🏯");
        document.getElementById('modal').style.display = 'flex';
    },
    // 過關恭喜視窗 (帶彈跳特效)
    showVictory(title, msg, actionsHtml) {
        this.openBase(title, msg, "🎉");
        document.getElementById('modal-actions').innerHTML = actionsHtml;
        const body = document.getElementById('modal-content');
        body.className = 'modal-body modal-pop'; // 加上彈跳 class
        document.getElementById('modal').style.display = 'flex';
    },
    // 升級視窗 (帶金光特效)
    showLevelUp(title, msg) {
        this.openBase(title, msg, "🏅");
        this.setSingleAction("太棒了", null);
        const body = document.getElementById('modal-content');
        body.className = 'modal-body modal-levelup'; // 加上升級特效 class
        document.getElementById('modal').style.display = 'flex';
    },
    
    // 內部共用方法
    openBase(title, content, icon) {
        document.getElementById('modal-title').textContent = title;
        const msgEl = document.getElementById('modal-msg');
        document.getElementById('modal-icon').textContent = icon;
        msgEl.innerHTML = '';
        if (content instanceof Node) msgEl.appendChild(content); else msgEl.innerHTML = content;
        // 重置 class
        document.getElementById('modal-content').className = 'modal-body';
        document.getElementById('modal').style.display = 'flex';
    },
    setSingleAction(btnText, onConfirm) {
        const actions = document.getElementById('modal-actions');
        actions.innerHTML = '';
        const btn = document.createElement('button'); btn.className = 'btn-primary w-full';
        btn.textContent = btnText; 
        btn.onclick = () => { Modal.close(); if(onConfirm) setTimeout(onConfirm, 50); }; 
        actions.appendChild(btn);
    },
    close() { document.getElementById('modal').style.display = 'none'; }
};

// --- NPC ---
const NPC = {
    say(msg, btnText="好", onConfirm=null) {
        document.getElementById('npc-text').innerHTML = msg.replace(/\n/g, '<br>');
        const btn = document.getElementById('npc-btn');
        btn.textContent = btnText;
        btn.onclick = () => { NPC.close(); if(onConfirm) setTimeout(onConfirm, 50); };
        document.getElementById('npc-modal').style.display = 'flex';
    },
    close() { document.getElementById('npc-modal').style.display = 'none'; }
};

// --- App 主控制器 ---
const App = {
    currentViewRealm: 0,
    notebookPage: 1, 
    NOTES_PER_PAGE: 4, 
    isLoadingRealm: false,

    init() { 
        if (typeof Data === 'undefined') { setTimeout(() => App.init(), 100); return; }
        Data.load(); 
        this.dailyResetCheck();
        this.currentViewRealm = Math.floor(Data.unlockedLevel / 100);
        this.ensureRealmLoaded(this.currentViewRealm, () => {
            this.updateUI(); 
            this.bindEvents(); 
            this.checkDailyStatus();
        });
    },

    dailyResetCheck() {
        const today = new Date().toDateString();
        if (Data.mission.date !== today) {
            Data.mission.date = today;
            Data.mission.count = 0;
            Data.mission.claimed = [false, false, false];
            Data.save();
        }
    },

    getRequiredXP(level) { return 2 * (level * level) + 25; },

    addXP(amount) {
        Data.xp += amount;
        let req = this.getRequiredXP(Data.playerLevel);
        let leveledUp = false;
        
        while (Data.xp >= req) {
            Data.xp -= req;
            Data.playerLevel++;
            req = this.getRequiredXP(Data.playerLevel);
            leveledUp = true;
        }
        
        if (leveledUp) {
            Data.save();
            ConfettiSystem.spawn(); // 升級撒花
            // 使用專屬升級視窗
            Modal.showLevelUp("等級提升！", `恭喜升到 ${Data.playerLevel} 等！\n獲得 5 根蠟燭！`);
            Data.keys += 5;
        }
        this.updateUI();
        Data.save();
    },

    ensureRealmLoaded(realmIdx, callback) {
        if (window.LevelCache && window.LevelCache[realmIdx]) { if (callback) callback(); return; }
        if (this.isLoadingRealm) return;
        this.isLoadingRealm = true;
        const fileNum = String(realmIdx + 1).padStart(2, '0');
        const script = document.createElement('script');
        script.src = `js/data_${fileNum}.js`;
        script.onload = () => { this.isLoadingRealm = false; Modal.close(); if (callback) callback(); };
        script.onerror = () => { this.isLoadingRealm = false; Modal.show("錯誤", "讀取失敗", "重試", "⚠️", () => this.ensureRealmLoaded(realmIdx, callback)); };
        document.body.appendChild(script);
    },

    switchView(id) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    },

    updateUI() { 
        document.getElementById('coin-text').textContent = Data.coins; 
        document.getElementById('key-text').textContent = Data.keys;
        document.getElementById('btn-hint-count').textContent = Data.keys;
        document.getElementById('shop-coin-text').textContent = Data.coins;

        const req = this.getRequiredXP(Data.playerLevel);
        document.getElementById('lvl-num').textContent = `${Data.playerLevel}等`;
        document.getElementById('lvl-progress').textContent = `${Data.xp}/${req}`;

        const hasClaimable = [0,1,2].some(i => {
            const targets = [3, 5, 10];
            return Data.mission.count >= targets[i] && !Data.mission.claimed[i];
        });
        document.getElementById('mission-dot').style.display = hasClaimable ? 'block' : 'none';

        const isFull = Data.keys > 9;
        const topAdBtn = document.getElementById('btn-ad');
        if (topAdBtn) { topAdBtn.style.opacity = isFull ? '0.3' : '1'; topAdBtn.style.pointerEvents = isFull ? 'none' : 'auto'; }
        const shopAdBtn = document.getElementById('shop-btn-watch-ad');
        if (shopAdBtn) {
            if (isFull) {
                shopAdBtn.textContent = "已滿"; shopAdBtn.disabled = true;
                shopAdBtn.className = "bg-stone-400 text-white px-3 py-1 rounded cursor-not-allowed";
            } else {
                shopAdBtn.textContent = "播放"; shopAdBtn.disabled = false;
                shopAdBtn.className = "bg-stone-800 text-white px-3 py-1 rounded";
            }
        }
    },

    bindEvents() {
        const bind = (id, action) => { const el = document.getElementById(id); if (el) el.onclick = action; };
        bind('btn-start', () => {
            this.showLevels();
            const audio = document.getElementById('bg-music');
            if (Data.musicOn && audio) { audio.play().catch(()=>{}); }
        });
        bind('btn-daily', () => this.dailyCheckIn());
        bind('btn-back-home', () => this.switchView('view-home'));
        bind('btn-stop-game', () => this.showLevels());
        bind('btn-reset', () => Game.resetLevel());
        bind('btn-check', () => Game.checkAnswer());
        bind('btn-back-note', () => this.switchView('view-home'));
        bind('btn-ad', () => this.watchAd());
        bind('btn-hint-bottom', () => Game.useHint());
        bind('btn-top-home', () => this.backToHomeConfirm());
        bind('btn-top-mission', () => this.showMissions());
        bind('btn-top-notebook', () => this.showNotebook());
        bind('btn-top-shop', () => document.getElementById('shop-modal').style.display = 'flex');
    },

    backToHomeConfirm() {
        if (document.getElementById('view-game').classList.contains('active')) {
            document.getElementById('modal-home-confirm').style.display = 'flex';
        } else {
            this.switchView('view-home');
        }
    },
    confirmBackToHome() {
        document.getElementById('modal-home-confirm').style.display = 'none';
        this.switchView('view-home');
    },

    showMissions() {
        const list = document.getElementById('mission-list');
        list.innerHTML = '';
        const targets = [3, 5, 10];
        const rewards = [{ coins: 10, xp: 5 }, { coins: 20, xp: 10 }, { coins: 30, xp: 15 }];
        targets.forEach((target, idx) => {
            const achieved = Data.mission.count >= target;
            const claimed = Data.mission.claimed[idx];
            const div = document.createElement('div');
            div.className = 'mission-row';
            let btnHtml = '';
            if (claimed) btnHtml = `<button class="btn-claim" disabled>已領取</button>`;
            else if (achieved) btnHtml = `<button class="btn-claim" onclick="App.claimMission(${idx})">領取</button>`;
            else btnHtml = `<span class="text-xs text-stone-400">${Data.mission.count}/${target}</span>`;
            div.innerHTML = `<div><div class="mission-desc">完成 ${target} 個新關卡</div><div class="mission-reward">🪙${rewards[idx].coins}  🏅${rewards[idx].xp}XP</div></div>${btnHtml}`;
            list.appendChild(div);
        });
        document.getElementById('mission-progress-text').textContent = Data.mission.count;
        document.getElementById('modal-mission').style.display = 'flex';
    },

    claimMission(idx) {
        if (Data.mission.claimed[idx]) return;
        const rewards = [{ coins: 10, xp: 5 }, { coins: 20, xp: 10 }, { coins: 30, xp: 15 }];
        Data.mission.claimed[idx] = true;
        Data.coins += rewards[idx].coins;
        this.addXP(rewards[idx].xp);
        Data.save();
        this.updateUI();
        this.showMissions();
    },

    spinWheel() {
        if (Data.coins < 50) return Modal.show("元寶不足", "每次抽獎需要 50 元寶。");
        Data.coins -= 50;
        this.updateUI();
        const wheel = document.getElementById('wheel');
        const btn = document.getElementById('btn-spin');
        btn.disabled = true;
        const randDeg = 1800 + Math.floor(Math.random() * 360);
        wheel.style.transform = `rotate(${randDeg}deg)`;
        setTimeout(() => {
            btn.disabled = false;
            wheel.style.transition = 'none';
            wheel.style.transform = `rotate(${randDeg % 360}deg)`;
            setTimeout(() => { wheel.style.transition = 'transform 3s cubic-bezier(0.2, 0.8, 0.3, 1)'; }, 50);
            const prize = Math.random() > 0.5 ? 10 : 100; 
            Data.coins += prize;
            Data.save();
            this.updateUI();
            Modal.show("抽獎結果", `恭喜獲得 ${prize} 元寶！`, "太棒了", "🎁");
        }, 3000);
    },

    watchAd() {
        if (Data.keys > 9) return Modal.show("提示", "蠟燭已滿！");
        AdController.showRewardAd(() => {
            Data.keys += 1; Data.save(); this.updateUI(); 
            Modal.show("獎勵發送", "獲得 1 根蠟燭 🕯️");
        });
    },
    watchAdMock(onSuccess) {
        Modal.show("廣告播放中...", "📺 模擬廣告 (2秒)", "...", "⏳");
        setTimeout(() => { if(onSuccess) onSuccess(); }, 2000);
    },
    checkDailyStatus() {
        const isChecked = Data.lastCheckIn === new Date().toDateString();
        const btnHome = document.getElementById('btn-daily'); 
        if(btnHome) { btnHome.innerHTML = isChecked ? "📅 今日已簽到" : "📅 簽到領蠟燭"; btnHome.style.opacity = isChecked ? "0.5":"1"; }
        const btnShop = document.getElementById('shop-btn-daily');
        if(btnShop) { btnShop.textContent = isChecked?"已領":"領取"; btnShop.disabled=isChecked; btnShop.className = isChecked?"bg-stone-400 text-white px-3 py-1 rounded":"bg-stone-800 text-white px-3 py-1 rounded"; }
    },
    dailyCheckIn() {
        if (Data.lastCheckIn === new Date().toDateString()) return Modal.show("提示", "已簽到！");
        Data.keys += 1; Data.lastCheckIn = new Date().toDateString(); Data.save(); this.updateUI(); this.checkDailyStatus(); Modal.show("簽到成功", "獲得 1 根蠟燭！");
    },
    changeRealm(d) {
        const nr = this.currentViewRealm + d;
        if (nr >= 0 && nr < 20 && Data.unlockedLevel >= nr * 100) { this.currentViewRealm = nr; this.ensureRealmLoaded(nr, () => { this.renderRealm(); }); }
        else if (Data.unlockedLevel < nr * 100) Modal.show("封印中", "請先完成上一個國度！");
    },
    showLevels() { this.currentViewRealm = Math.floor(Data.unlockedLevel / 100); this.ensureRealmLoaded(this.currentViewRealm, () => { this.renderRealm(); this.switchView('view-levels'); }); },
    renderRealm() {
        const container = document.getElementById('level-list-container'); if(!container) return; container.innerHTML = '';
        document.getElementById('realm-title').textContent = RealmNames[this.currentViewRealm] || `第 ${this.currentViewRealm + 1} 國度`;
        for (let idx = this.currentViewRealm * 100; idx < (this.currentViewRealm + 1) * 100; idx++) {
            const btn = document.createElement('button'); btn.className = 'level-btn';
            if (idx < Data.unlockedLevel) { btn.classList.add('completed'); btn.innerHTML = `<small>已破</small>${idx + 1}`; btn.onclick = () => Game.startLevel(idx); }
            else if (idx === Data.unlockedLevel) { btn.textContent = idx + 1; btn.onclick = () => Game.startLevel(idx); }
            else { btn.classList.add('locked'); btn.textContent = '🔒'; }
            container.appendChild(btn);
        }
    },
    showNotebook() { this.notebookPage = 1; this.renderNotebookPage(); this.switchView('view-notebook'); },
    changeNotebookPage(d) { this.notebookPage += d; this.renderNotebookPage(); },
    renderNotebookPage() { 
        const list = document.getElementById('notebook-list');
        const saved = JSON.parse(localStorage.getItem('zyramid_notebook') || '{}');
        const words = Object.keys(saved).reverse();
        list.innerHTML = '';
        if (words.length === 0) { list.innerHTML = '<div class="text-center text-stone-400 mt-10">筆記本是空的</div>'; return; }
        const start = (this.notebookPage - 1) * this.NOTES_PER_PAGE;
        const pageWords = words.slice(start, start + this.NOTES_PER_PAGE);
        pageWords.forEach(w => {
            const data = saved[w];
            const div = document.createElement('div');
            div.className = 'bg-white p-4 rounded shadow-sm border border-stone-300 relative mb-3';
            div.innerHTML = `<div class="flex justify-between items-start mb-2"><span class="font-bold text-xl">${w}</span><button class="del-btn text-lg">🗑</button></div><div class="text-sm text-stone-600 mb-2">[釋義] ${data.def||''}</div><div class="text-xs text-amber-700 bg-amber-50 p-2">[造句] ${data.ex||''}</div>`;
            div.querySelector('.del-btn').onclick = () => { delete saved[w]; localStorage.setItem('zyramid_notebook', JSON.stringify(saved)); this.renderNotebookPage(); };
            list.appendChild(div);
        });
        const nav = document.createElement('div');
        nav.className = 'flex justify-center gap-4 mt-4';
        if(this.notebookPage > 1) { const b=document.createElement('button'); b.textContent='<'; b.onclick=()=>this.changeNotebookPage(-1); nav.appendChild(b); }
        if(start + this.NOTES_PER_PAGE < words.length) { const b=document.createElement('button'); b.textContent='>'; b.onclick=()=>this.changeNotebookPage(1); nav.appendChild(b); }
        list.appendChild(nav);
    }
};

// --- Game 遊戲邏輯 ---
const Game = {
    currentLevelIdx: 0, selectedTile: null, tutorialStep: 0, hintIndex: 0, hintTimeout: null,

    getLevelData(globalIdx) {
        const realmIdx = Math.floor(globalIdx / 100);
        const localIdx = globalIdx % 100;
        if (window.LevelCache && window.LevelCache[realmIdx]) return window.LevelCache[realmIdx][localIdx];
        return null;
    },
    startLevel(idx) {
        const realmIdx = Math.floor(idx / 100);
        App.ensureRealmLoaded(realmIdx, () => { this._startLevelInternal(idx); });
    },
    _startLevelInternal(idx) {
        this.currentLevelIdx = idx;
        this.hintIndex = 0;
        const lvl = this.getLevelData(idx);
        if (!lvl) { Modal.show("錯誤", "無資料", "返回", "⚠️", () => App.showLevels()); return; }
        
        document.getElementById('current-level-title').textContent = `第 ${idx + 1} 關`;
        const grid = document.getElementById('answer-grid'); grid.innerHTML = '';
        const hintArea = document.getElementById('hint-result-area'); if(hintArea) { hintArea.innerHTML = ''; hintArea.className = ''; }
        this.updateHintButton();

        lvl.layout.forEach(len => {
            const row = document.createElement('div'); row.className = 'tower-col';
            if (idx >= 0) {
                const clearBtn = document.createElement('div');
                clearBtn.className = 'tower-clear-btn'; clearBtn.textContent = '×';
                clearBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (Game.tutorialStep > 0 && idx === 0 && Game.tutorialStep !== 11) return; 
                    if (Game.tutorialStep === 11 && idx === 0) {
                        const towerIndex = Array.from(grid.children).indexOf(row);
                        if (towerIndex !== 2) return; 
                        Game.clearTower(row);
                        Game.tutorialStep = 12; Game.updateTutorialUI();
                        return;
                    }
                    Game.clearTower(row);
                };
                row.appendChild(clearBtn);
            }
            for(let i=0; i<len; i++) { const d = document.createElement('div'); d.className='drop-zone'; row.appendChild(d); }
            grid.appendChild(row);
        });

        const pool = document.getElementById('character-pool'); pool.innerHTML = '';
        lvl.chars.split('').sort(()=>Math.random()-0.5).forEach(c => {
            const t = document.createElement('div'); t.className='char-tile'; t.textContent=c; pool.appendChild(t);
        });
        this.selectedTile = null; 
        
        this.tutorialStep = 0;
        this.clearTutorialHighlights();
        App.switchView('view-game');

        if (idx === 0) { setTimeout(() => { NPC.say("歡迎來到漢字的國度！...", "好", () => { this.tutorialStep = 1; this.updateTutorialUI(); }); }, 500); } 
        else if (idx === 1 && Data.keys < 100) { setTimeout(() => { NPC.say("卡關了怎麼辦？", "怎麼辦", () => { NPC.say("這回合免費使用提示！", "試試看", () => { this.tutorialStep = 30; this.updateTutorialUI(); }); }); }, 500); }
    },
    updateHintButton() {
        const btn = document.getElementById('btn-hint-bottom'); if (!btn) return;
        const lvl = this.getLevelData(this.currentLevelIdx);
        if (!lvl || this.hintIndex >= lvl.sols.length) { btn.classList.add('btn-disabled'); btn.style.opacity = '0.5'; } else { btn.classList.remove('btn-disabled'); btn.style.opacity = '1'; }
    },
    clearTower(row) {
        row.querySelectorAll('.drop-zone').forEach(zone => {
            if (zone.hasChildNodes()) {
                const tile = zone.firstChild;
                document.getElementById('character-pool').appendChild(tile);
                if (tile.classList.contains('selected')) { tile.classList.remove('selected'); Game.selectedTile = null; }
            }
        });
    },
    resetLevel() { this._startLevelInternal(this.currentLevelIdx); },
    updateTutorialUI() { 
        this.clearTutorialHighlights();
        if (this.tutorialStep === 0) return;
        const pool = Array.from(document.getElementById('character-pool').children);
        const towers = document.getElementById('answer-grid').children;
        let target = null;
        try {
            switch(this.tutorialStep) {
                case 1: target = pool.find(t => t.textContent.trim() === '希'); break;
                case 2: target = towers[0].children[1]; break; 
                case 3: target = pool.find(t => t.textContent.trim() === '望'); break;
                case 4: target = towers[0].children[2]; break; 
                case 5: NPC.say("很好！...", "繼續", () => { this.tutorialStep = 6; this.updateTutorialUI(); }); break;
                case 6: target = pool.find(t => t.textContent.trim() === '游'); break;
                case 7: target = towers[2].children[1]; break; 
                case 8: target = pool.find(t => t.textContent.trim() === '泳'); break;
                case 9: target = towers[2].children[2]; break; 
                case 10: NPC.say("拆掉重蓋！", "好", () => { this.tutorialStep = 11; this.updateTutorialUI(); }); break;
                case 11: target = towers[2].querySelector('.tower-clear-btn'); break;
                case 12: NPC.say("完成剩下的吧！", "開始", () => { this.tutorialStep = 13; this.updateTutorialUI(); }); break;
                case 13: target = pool.find(t => t.textContent.trim() === '游'); break;
                case 14: target = towers[1].children[1]; break; 
                case 15: target = pool.find(t => t.textContent.trim() === '泳'); break;
                case 16: target = towers[1].children[2]; break; 
                case 17: target = pool.find(t => t.textContent.trim() === '池'); break;
                case 18: target = towers[1].children[3]; break; 
                case 19: target = pool.find(t => t.textContent.trim() === '吃'); break;
                case 20: target = towers[2].children[1]; break; 
                case 21: target = pool.find(t => t.textContent.trim() === '飯'); break;
                case 22: target = towers[2].children[2]; break; 
                case 23: target = document.getElementById('btn-check'); break;
                case 24: setTimeout(() => { target = document.querySelector('#modal-actions button:first-child'); if(target) this.highlightElement(target); }, 300); return;
                case 25: setTimeout(() => { target = document.querySelector('.heart-btn'); if(target) this.highlightElement(target); }, 300); return;
                case 26: setTimeout(() => { target = document.querySelector('#modal-actions button'); if(target) this.highlightElement(target); }, 300); return;
                case 27: setTimeout(() => { target = document.querySelector('#modal-actions button:last-child'); if(target) this.highlightElement(target); }, 300); return;
                case 30: target = document.getElementById('btn-hint-bottom'); break;
                case 31: NPC.say("填入了解！", "沒問題", () => { this.tutorialStep = 32; this.updateTutorialUI(); }); break;
                case 32: target = pool.find(t => t.textContent.trim() === '了'); break;
                case 33: target = towers[0].children[1]; break; 
                case 34: target = pool.find(t => t.textContent.trim() === '解'); break;
                case 35: target = towers[0].children[2]; break; 
                case 36: NPC.say("再用一次提示。", "好", () => { this.tutorialStep = 37; this.updateTutorialUI(); }); break;
                case 37: target = document.getElementById('btn-hint-bottom'); break;
                case 38: target = pool.find(t => t.textContent.trim() === '點'); break;
                case 39: target = towers[1].children[1]; break;
                case 40: target = pool.find(t => t.textContent.trim() === '選'); break;
                case 41: target = towers[1].children[2]; break;
                case 43: target = pool.find(t => t.textContent.trim() === '詢'); break;
                case 44: target = towers[2].children[1]; break;
                case 45: target = pool.find(t => t.textContent.trim() === '問'); break;
                case 46: target = towers[2].children[2]; break;
                case 47: target = document.getElementById('btn-check'); break;
            }
        } catch(e) {}
        if(target) this.highlightElement(target);
    },
    highlightElement(el) { 
        document.getElementById('tutorial-mask').style.display = 'block';
        el.classList.add('tutorial-highlight');
        let ptr = document.getElementById('tutorial-pointer');
        if (!ptr) {
            ptr = document.createElement('div'); ptr.id = 'tutorial-pointer'; ptr.textContent = '👆';
            ptr.style.cssText = "position:fixed; font-size:40px; z-index:9010; pointer-events:none;"; 
            ptr.animate([{transform:'translateY(0)'},{transform:'translateY(-10px)'}], {duration:600, iterations:Infinity, direction:'alternate'});
            document.body.appendChild(ptr);
        }
        setTimeout(() => {
            const rect = el.getBoundingClientRect();
            ptr.style.left = (rect.left + rect.width/2 - 20) + 'px'; 
            ptr.style.top = (rect.bottom + 5) + 'px';
            ptr.style.display = 'block';
        }, 50);
    },
    clearTutorialHighlights() { 
        document.getElementById('tutorial-mask').style.display = 'none';
        document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
        const ptr = document.getElementById('tutorial-pointer'); if(ptr) ptr.style.display = 'none';
    },
    useHint() {
        if (this.tutorialStep === 30) { this.scriptedHint("了解"); this.hintIndex++; this.updateHintButton(); this.tutorialStep = 31; this.updateTutorialUI(); return; }
        if (this.tutorialStep === 37) { this.scriptedHint("點選"); this.hintIndex++; this.updateHintButton(); this.tutorialStep = 38; this.updateTutorialUI(); return; }
        if(Data.keys < 1) return NPC.say("蠟燭不足。");
        const lvl = this.getLevelData(this.currentLevelIdx);
        if (!lvl || this.hintIndex >= lvl.sols.length) return;
        Data.keys -= 1; Data.save(); App.updateUI();
        const word = lvl.sols[this.hintIndex]; this.scriptedHint(word);
        this.hintIndex++; this.updateHintButton();
    },
    scriptedHint(word) {
        const area = document.getElementById('hint-result-area');
        if(area) { area.innerHTML = ''; const span = document.createElement('span'); span.textContent = "💡 " + word; area.appendChild(span); area.classList.add('show'); if (this.hintTimeout) clearTimeout(this.hintTimeout); this.hintTimeout = setTimeout(() => { area.classList.remove('show'); }, 4000); }
    },
    checkAnswer() {
        if (this.tutorialStep > 0 && this.tutorialStep !== 23 && this.tutorialStep !== 47) return;
        const pool = document.getElementById('character-pool');
        if(pool.children.length > 0) return Modal.show("提示", "請將磚塊全部砌上！");
        let player = [];
        document.querySelectorAll('#answer-grid > div').forEach(row => { let w = ""; row.querySelectorAll('.drop-zone').forEach(z => { if(z.firstChild) w += z.firstChild.textContent; }); player.push(w); });
        const lvl = this.getLevelData(this.currentLevelIdx);
        if(player.sort().join(',') === [...lvl.sols].sort().join(',')) {
            // Check New Level
            if(this.currentLevelIdx >= Data.unlockedLevel) {
                Data.unlockedLevel = this.currentLevelIdx + 1;
                Data.coins += 1;
                Data.mission.count++;
                App.addXP(1);
            } else {
                Data.coins += 1; 
            }
            Data.save();
            App.updateUI();

            ConfettiSystem.spawn(); // 撒花

            if (this.tutorialStep === 23) { this.tutorialStep = 24; this.clearTutorialHighlights(); }
            if (this.tutorialStep === 47) { this.tutorialStep = 0; this.clearTutorialHighlights(); }

            const showVictory = () => {
                const actionsHtml = `
                    <button class="btn-secondary w-full mb-2" onclick="
                        if(Game.tutorialStep === 24) { Game.tutorialStep = 25; Game.updateTutorialUI(); } 
                        Game.showVocab();
                    ">查看詞語</button>
                    <button class="btn-primary w-full" onclick="
                        if(Game.tutorialStep >= 24 && Game.tutorialStep < 27) return;
                        if(Game.tutorialStep === 27) { Game.tutorialStep = 0; Game.clearTutorialHighlights(); }
                        Modal.close();
                        const nextAction = () => {
                            if(Game.currentLevelIdx < 1999) Game.startLevel(Game.currentLevelIdx + 1); 
                            else { Modal.show('全破', '恭喜！', '太強了'); App.showLevels(); }
                        };
                        if (Game.currentLevelIdx > 0 && (Game.currentLevelIdx + 1) % 4 === 0) { AdController.showInterstitialAd(nextAction); } else { nextAction(); }
                    ">下一關</button>
                `;
                
                let msg = "恭喜！獲得紀念金幣: 🪙 +1";
                if(this.currentLevelIdx >= Data.unlockedLevel -1) msg += "\n(新關卡：經驗 +1)";
                
                Modal.showVictory("修築完成", msg, actionsHtml);
                
                if(this.tutorialStep === 24 || this.tutorialStep === 27) this.updateTutorialUI();
            };
            this.showVictory = showVictory; // Bind for internal call
            this.showVocab = () => {
                const c = document.createElement('div'); c.style.cssText = "text-align:left; max-height:250px; overflow-y:auto;";
                const saved = JSON.parse(localStorage.getItem('zyramid_notebook')||'{}');
                lvl.sols.forEach(w => {
                    const info = lvl.details[w] || {def:'-', ex:''};
                    const row = document.createElement('div'); row.className = 'vocab-row';
                    const txt = document.createElement('div'); txt.innerHTML = `<div class="font-bold text-lg text-stone-800">【${w}】</div><div class="text-sm text-stone-600 mb-1">${info.def}</div>`;
                    const btn = document.createElement('button'); btn.className = 'heart-btn'; btn.textContent = '❤'; if(saved[w]) btn.classList.add('saved');
                    btn.onclick = () => {
                        if(Game.tutorialStep === 25) { Game.tutorialStep = 26; Game.clearTutorialHighlights(); NPC.say("...", "返回", () => { Game.tutorialStep = 26; Game.showVocab(); }); }
                        const cur = JSON.parse(localStorage.getItem('zyramid_notebook')||'{}'); if(cur[w]) { delete cur[w]; btn.classList.remove('saved'); } else { cur[w] = info; btn.classList.add('saved'); } localStorage.setItem('zyramid_notebook', JSON.stringify(cur));
                    };
                    row.appendChild(txt); row.appendChild(btn); c.appendChild(row);
                });
                if (Game.tutorialStep === 26) { Modal.show("本關字彙", c, "返回", "📖", () => { Game.tutorialStep = 27; Game.showVictory(); }); setTimeout(() => Game.updateTutorialUI(), 200); } 
                else { Modal.show("本關字彙", c, "返回", "📖", () => Game.showVictory()); }
                if(Game.tutorialStep === 25) setTimeout(() => Game.updateTutorialUI(), 200);
            };
            this.showVictory();
        } else { Modal.show("結構錯誤", "詞語組合不對，\n塔身不穩，請重新調整！", "重試"); }
    },
    handleClick(e) {
        if(!document.getElementById('view-game').classList.contains('active')) return;
        if (Game.tutorialStep > 0 && Game.tutorialStep < 47) {
            const t = e.target.closest('.char-tile');
            const z = e.target.closest('.drop-zone');
            let valid = false;
            if(Game.tutorialStep>=1) valid=true; 
            if(!valid) return;
        }
        const tile = e.target.closest('.char-tile');
        if (tile) {
            if (tile.parentElement.classList.contains('drop-zone')) { document.getElementById('character-pool').appendChild(tile); tile.classList.remove('selected'); Game.selectedTile = null; } 
            else { 
                if (tile.classList.contains('selected')) { tile.classList.remove('selected'); Game.selectedTile = null; } 
                else { if (Game.selectedTile) Game.selectedTile.classList.remove('selected'); tile.classList.add('selected'); Game.selectedTile = tile; } 
            }
        } else {
            const zone = e.target.closest('.drop-zone');
            if (zone && Game.selectedTile && !zone.hasChildNodes()) { zone.appendChild(Game.selectedTile); Game.selectedTile.classList.remove('selected'); Game.selectedTile = null; }
        }
        if (Game.tutorialStep > 0 && Game.tutorialStep < 47) {
            setTimeout(() => {
                const next = Game.tutorialStep + 1;
                const autoSteps = [1,2,3,4, 6,7,8,9, 13,14,15,16,17,18,19,20,21,22, 32,33,34,35, 38,39,40,41, 43,44,45,46];
                if (autoSteps.includes(Game.tutorialStep)) { Game.tutorialStep = next; Game.updateTutorialUI(); }
            }, 50);
        }
    }
};

window.addEventListener('load', () => { setTimeout(() => { try { App.init(); } catch (e) { console.error(e); } }, 100); });
document.addEventListener('click', Game.handleClick);
