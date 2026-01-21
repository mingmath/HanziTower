// --- 錯誤捕捉 ---
window.onerror = function(msg, url, line) {
    const el = document.getElementById('error-console');
    if (el) { el.style.display = 'block'; el.innerHTML += `錯誤: ${msg}<br>行數: ${line}<br>`; }
    return false;
};

// --- Google H5 Ads 設定與控制器 ---
let wasMusicPlaying = false; 

const AdController = {
    init() {
        // H5 Games Ads 全域設定
        window.adConfig = function(o) { 
            o.preloadAdBreaks = 'on'; 
            o.sound = 'on'; 
            o.onReady = () => { console.log("H5 Ads API is ready."); };
        };
    },

    beforeAd() {
        const audio = document.getElementById('bg-music');
        // 安全檢查：只有當 audio 存在時才操作
        if (audio && !audio.paused) {
            wasMusicPlaying = true;
            audio.pause();
        } else {
            wasMusicPlaying = false;
        }
        console.log("Ad starting... game paused.");
    },

    afterAd() {
        const audio = document.getElementById('bg-music');
        // 安全檢查：只有當 audio 存在且原本有播放時才恢復
        if (wasMusicPlaying && audio) {
            audio.play().catch(()=>{});
        }
        console.log("Ad finished... game resumed.");
    },

    // 呼叫獎勵廣告
    showRewardAd(onSuccess) {
        if (typeof adBreak !== 'function') {
            console.warn("Ads SDK not ready or blocked, using Mock.");
            App.watchAdMock(onSuccess); 
            return;
        }

        adBreak({
            type: 'reward',       
            name: 'get_candle',   
            beforeAd: AdController.beforeAd,
            afterAd: AdController.afterAd,
            beforeReward: (showAdFn) => { showAdFn(); },
            adDismissed: () => { Modal.show("提示", "必須看完廣告才能獲得獎勵！"); },
            adViewed: () => { if (onSuccess) onSuccess(); }
        });
    },

    // 呼叫插頁廣告 (過關使用)
    showInterstitialAd(nextAction) {
        if (typeof adBreak !== 'function') {
            if(nextAction) nextAction();
            return;
        }

        adBreak({
            type: 'next',
            name: 'level_complete',
            beforeAd: AdController.beforeAd,
            afterAd: AdController.afterAd,
            adBreakDone: () => {
                // 確保無論有無廣告都會執行下一步
                if(nextAction) nextAction();
            }
        });
    }
};

// 初始化廣告設定
AdController.init();

// --- 工具：模態視窗 ---
const Modal = {
    show(title, content, btnText="確定", icon="📜", onConfirm=null) {
        const titleEl = document.getElementById('modal-title');
        const msgEl = document.getElementById('modal-msg');
        const iconEl = document.getElementById('modal-icon');
        const actions = document.getElementById('modal-actions');
        const modal = document.getElementById('modal');

        if(titleEl) titleEl.textContent = title; 
        msgEl.innerHTML = '';
        if (content instanceof Node) msgEl.appendChild(content); else msgEl.innerHTML = content;
        if(iconEl) iconEl.textContent = icon;
        
        if(actions) {
            actions.innerHTML = '';
            const btn = document.createElement('button'); btn.className = 'btn-primary w-full';
            btn.textContent = btnText; 
            btn.onclick = () => { 
                Modal.close(); 
                if(onConfirm) setTimeout(onConfirm, 50); 
            }; 
            actions.appendChild(btn);
        }
        if(modal) modal.style.display = 'flex';
    },
    show2(title, msg) {
        const titleEl = document.getElementById('modal-title');
        const msgEl = document.getElementById('modal-msg');
        const iconEl = document.getElementById('modal-icon');
        const modal = document.getElementById('modal');

        if(titleEl) titleEl.textContent = title; 
        if(msgEl) msgEl.innerHTML = msg;
        if(iconEl) iconEl.textContent = "🏯";
        if(modal) modal.style.display = 'flex';
    },
    close() { const modal = document.getElementById('modal'); if(modal) modal.style.display = 'none'; }
};

// --- NPC 對話控制器 ---
const NPC = {
    say(msg, btnText="好", onConfirm=null) {
        const modal = document.getElementById('npc-modal');
        const textEl = document.getElementById('npc-text');
        const btn = document.getElementById('npc-btn');

        if(textEl) textEl.innerHTML = msg.replace(/\n/g, '<br>');
        if(btn) {
            btn.textContent = btnText;
            btn.onclick = () => {
                NPC.close();
                if(onConfirm) setTimeout(onConfirm, 50);
            };
        }
        if(modal) modal.style.display = 'flex';
    },
    close() {
        const modal = document.getElementById('npc-modal');
        if(modal) modal.style.display = 'none';
    }
};

// --- App 主控制器 ---
const App = {
    LIFF_ID: "2008923686-LA2FbXe8",    
    currentViewRealm: 0,
    notebookPage: 1, 
    NOTES_PER_PAGE: 4, 
    isLoadingRealm: false,

    init() { 
        if (typeof Data === 'undefined') { alert("嚴重錯誤：無法讀取核心資料"); return; }
        Data.load(); 
        
        this.currentViewRealm = Math.floor(Data.unlockedLevel / 100);
        
        this.ensureRealmLoaded(this.currentViewRealm, () => {
            this.updateUI(); 
            this.bindEvents(); 
            this.checkDailyStatus();
        });
    },

    ensureRealmLoaded(realmIdx, callback) {
        if (window.LevelCache && window.LevelCache[realmIdx]) {
            if (callback) callback();
            return;
        }

        if (this.isLoadingRealm) return;
        this.isLoadingRealm = true;

        const fileNum = String(realmIdx + 1).padStart(2, '0');
        const script = document.createElement('script');
        script.src = `js/data_${fileNum}.js`;
        
        script.onload = () => {
            console.log(`Realm ${realmIdx + 1} data loaded.`);
            this.isLoadingRealm = false;
            Modal.close(); 
            if (callback) callback();
        };

        script.onerror = () => {
            console.error(`Failed to load data for realm ${realmIdx + 1}`);
            this.isLoadingRealm = false;
            Modal.show("錯誤", "無法讀取關卡資料，請檢查網路連線。", "重試", "⚠️", () => {
                this.ensureRealmLoaded(realmIdx, callback);
            });
        };

        document.body.appendChild(script);
    },

    switchView(id) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    },

    updateUI() { 
        document.getElementById('coin-text').textContent = Data.coins; 
        document.getElementById('key-text').textContent = Data.keys;
        document.getElementById('hint-count').textContent = Data.keys;
    },

    bindEvents() {
        const bind = (id, action) => { const el = document.getElementById(id); if (el) el.onclick = action; };
        bind('btn-start', () => {
            this.showLevels();
            // 安全檢查：只有當 audio 存在時才播放
            const audio = document.getElementById('bg-music');
            if (Data.musicOn && audio) { 
                audio.play().catch(()=>{}); 
            }
        });
        bind('btn-daily', () => this.dailyCheckIn());
        bind('btn-notebook', () => this.showNotebook());
        bind('btn-top-notebook', () => this.showNotebook());
        bind('btn-back-home', () => this.switchView('view-home'));
        bind('btn-stop-game', () => this.showLevels());
        bind('btn-hint', () => Game.useHint());
        bind('btn-reset', () => Game.resetLevel());
        bind('btn-check', () => Game.checkAnswer());
        bind('btn-back-note', () => this.switchView('view-home'));
        bind('btn-shop', () => document.getElementById('shop-modal').style.display = 'flex');
        bind('btn-ad', () => this.watchAd());
    },

    watchAd() {
        AdController.showRewardAd(() => {
            Data.keys += 1; Data.save(); this.updateUI(); 
            Modal.show("獎勵發送", "感謝觀看！獲得 1 根蠟燭 🕯️");
        });
    },

    watchAdMock(onSuccess) {
        Modal.show("廣告播放中...", "📺 正在播放精彩廣告... (模擬 2秒)", "...", "⏳");
        setTimeout(() => { if(onSuccess) onSuccess(); }, 2000);
    },

    checkDailyStatus() {
        const isChecked = Data.lastCheckIn === new Date().toDateString();
        const btnHome = document.getElementById('btn-daily'); 
        if (btnHome) {
            btnHome.innerHTML = !isChecked ? "📅 簽到領蠟燭 (尚未)" : "📅 今日已簽到";
            btnHome.style.opacity = !isChecked ? "1" : "0.5";
        }
        const btnShop = document.getElementById('shop-btn-daily');
        if (btnShop) {
            btnShop.textContent = isChecked ? "已領" : "領取";
            btnShop.classList.toggle('btn-disabled', isChecked);
            btnShop.disabled = isChecked;
        }
    },
    
    dailyCheckIn() {
        if (Data.lastCheckIn === new Date().toDateString()) return Modal.show("提示", "您今天已經領過蠟燭囉！");
        Data.keys += 1; Data.lastCheckIn = new Date().toDateString(); Data.save(); this.updateUI(); this.checkDailyStatus(); Modal.show("簽到成功", "獲得 1 根蠟燭！🕯️");
    },

    changeRealm(d) {
        const nr = this.currentViewRealm + d;
        if (nr >= 0 && nr < 20 && Data.unlockedLevel >= nr * 100) { 
            this.currentViewRealm = nr; 
            this.ensureRealmLoaded(nr, () => {
                this.renderRealm(); 
            });
        }
        else if (Data.unlockedLevel < nr * 100) Modal.show("封印中", "請先完成上一個國度！");
    },

    showLevels() {
        this.currentViewRealm = Math.floor(Data.unlockedLevel / 100);
        this.ensureRealmLoaded(this.currentViewRealm, () => {
            this.renderRealm(); 
            this.switchView('view-levels');
        });
    },

    renderRealm() {
        const container = document.getElementById('level-list-container'); if(!container) return; container.innerHTML = '';
        document.getElementById('realm-title').textContent = RealmNames[this.currentViewRealm] || `第 ${this.currentViewRealm + 1} 國度`;
        
        for (let idx = this.currentViewRealm * 100; idx < (this.currentViewRealm + 1) * 100; idx++) {
            const btn = document.createElement('button'); btn.className = 'level-btn';
            if (idx < Data.unlockedLevel) { 
                btn.classList.add('completed'); 
                btn.innerHTML = `<small>已破</small>${idx + 1}`; 
                btn.onclick = () => Game.startLevel(idx); 
            }
            else if (idx === Data.unlockedLevel) { 
                btn.textContent = idx + 1; 
                btn.onclick = () => Game.startLevel(idx); 
            }
            else { 
                btn.classList.add('locked'); 
                btn.textContent = '🔒'; 
            }
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
    currentLevelIdx: 0,
    selectedTile: null,
    tutorialStep: 0, 
    hintIndex: 0,

    getLevelData(globalIdx) {
        const realmIdx = Math.floor(globalIdx / 100);
        const localIdx = globalIdx % 100;
        if (window.LevelCache && window.LevelCache[realmIdx]) {
            return window.LevelCache[realmIdx][localIdx];
        }
        return null;
    },

    startLevel(idx) {
        const realmIdx = Math.floor(idx / 100);
        App.ensureRealmLoaded(realmIdx, () => {
            this._startLevelInternal(idx);
        });
    },

    _startLevelInternal(idx) {
        this.currentLevelIdx = idx;
        this.hintIndex = 0;
        
        const lvl = this.getLevelData(idx);
        
        if (!lvl) {
            Modal.show("錯誤", "找不到此關卡資料", "返回", "⚠️", () => App.showLevels());
            return;
        }

        document.getElementById('current-level-title').textContent = `第 ${idx + 1} 關`;
        const grid = document.getElementById('answer-grid'); grid.innerHTML = '';
        const hintArea = document.getElementById('hint-result-area'); if(hintArea) hintArea.innerHTML = '';
        
        this.updateHintButton();

        lvl.layout.forEach(len => {
            const row = document.createElement('div'); row.className = 'tower-col';
            if (idx >= 0) {
                const clearBtn = document.createElement('div');
                clearBtn.className = 'tower-clear-btn';
                clearBtn.textContent = '×';
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

        if (idx === 0) { 
            setTimeout(() => {
                NPC.say("歡迎來到漢字的國度！我是這裡的守護者。\n請協助將崩塌的「字塔」復原。", "好", () => {
                    this.tutorialStep = 1; this.updateTutorialUI();
                });
            }, 500);
        } 
        else if (idx === 1 && Data.keys < 100) { 
             setTimeout(() => {
                NPC.say("隨著旅程前進，字會越來越多。\n如果卡關了怎麼辦呢？", "怎麼辦", () => {
                    NPC.say("別擔心，這回合特別讓你\n「免費」使用提示！", "試試看", () => {
                        this.tutorialStep = 30; this.updateTutorialUI(); 
                    });
                });
            }, 500);
        }
    },

    updateHintButton() {
        const btn = document.getElementById('btn-hint');
        if (!btn) return;
        const lvl = this.getLevelData(this.currentLevelIdx);
        if (!lvl || this.hintIndex >= lvl.sols.length) {
            btn.classList.add('btn-disabled');
        } else {
            btn.classList.remove('btn-disabled');
        }
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

    resetLevel() {
        this._startLevelInternal(this.currentLevelIdx);
    },

    updateTutorialUI() {
        this.clearTutorialHighlights();
        if (this.tutorialStep === 0) return;

        const pool = Array.from(document.getElementById('character-pool').children);
        const towers = document.getElementById('answer-grid').children;
        let target = null;

        try {
            switch(this.tutorialStep) {
                // 第一關教學：基礎操作
                case 1: target = pool.find(t => t.textContent.trim() === '希'); break;
                case 2: target = towers[0].children[1]; break; 
                case 3: target = pool.find(t => t.textContent.trim() === '望'); break;
                case 4: target = towers[0].children[2]; break; 
                
                case 5:
                    NPC.say("很好！接下來試試右邊的塔。\n有時候我們可能會眼花看錯...", "繼續", () => {
                        this.tutorialStep = 6; this.updateTutorialUI();
                    }); break;
                
                case 6: target = pool.find(t => t.textContent.trim() === '游'); break;
                case 7: target = towers[2].children[1]; break; 
                case 8: target = pool.find(t => t.textContent.trim() === '泳'); break;
                case 9: target = towers[2].children[2]; break; 
                
                case 10:
                    NPC.say("哎呀，這座塔只有兩層，但「游泳池」需要三個字。\n請點擊「紅色叉叉」拆掉重蓋！", "好", () => {
                        this.tutorialStep = 11; this.updateTutorialUI();
                    }); break;
                
                case 11: 
                    const btn = towers[2].querySelector('.tower-clear-btn');
                    if(btn) target = btn;
                    break;
                
                case 12:
                    NPC.say("現在你知道方法了，請將剩下的詞語完成吧！\n(游泳池、吃飯)", "開始", () => {
                        this.tutorialStep = 13; this.updateTutorialUI();
                    }); break;
                
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

                // 勝利畫面引導
                case 24: 
                    setTimeout(() => {
                        target = document.querySelector('#modal-actions button:first-child'); 
                        if(target) this.highlightElement(target);
                    }, 300); return;
                
                case 25: 
                    setTimeout(() => {
                        target = document.querySelector('.heart-btn'); 
                        if(target) this.highlightElement(target);
                    }, 300); return;

                case 26: 
                    setTimeout(() => {
                        target = document.querySelector('#modal-actions button'); 
                        if(target) this.highlightElement(target);
                    }, 300); return;

                case 27: 
                    setTimeout(() => {
                        target = document.querySelector('#modal-actions button:last-child'); 
                        if(target) this.highlightElement(target);
                    }, 300); return;

                // 第二關教學
                case 30: target = document.getElementById('btn-hint'); break;
                case 31: 
                    NPC.say("瞧！我告訴你第一個詞是「了解」。\n請試著填入吧！", "沒問題", () => {
                        this.tutorialStep = 32; this.updateTutorialUI();
                    }); break;
                
                case 32: target = pool.find(t => t.textContent.trim() === '了'); break;
                case 33: target = towers[0].children[1]; break; 
                case 34: target = pool.find(t => t.textContent.trim() === '解'); break;
                case 35: target = towers[0].children[2]; break; 

                case 36: 
                    NPC.say("很好！讓我們再用一次提示。", "好", () => {
                        this.tutorialStep = 37; this.updateTutorialUI();
                    }); break;
                case 37: target = document.getElementById('btn-hint'); break;

                case 38: target = pool.find(t => t.textContent.trim() === '點'); break;
                case 39: target = towers[1].children[1]; break;
                case 40: target = pool.find(t => t.textContent.trim() === '選'); break;
                case 41: target = towers[1].children[2]; break;

                case 42:
                    NPC.say("顯然最後剩下的就是「詢問」了！\n把它完成吧。", "沒問題", () => {
                        this.tutorialStep = 43; this.updateTutorialUI();
                    }); break;

                case 43: target = pool.find(t => t.textContent.trim() === '詢'); break;
                case 44: target = towers[2].children[1]; break;
                case 45: target = pool.find(t => t.textContent.trim() === '問'); break;
                case 46: target = towers[2].children[2]; break;

                case 47: target = document.getElementById('btn-check'); break;
            }
        } catch(e) { console.warn("Tutorial Error:", e); }

        if(target) this.highlightElement(target);
    },

    highlightElement(el) {
        document.getElementById('tutorial-mask').style.display = 'block';
        el.classList.add('tutorial-highlight');
        
        let ptr = document.getElementById('tutorial-pointer');
        if (!ptr) {
            ptr = document.createElement('div'); 
            ptr.id = 'tutorial-pointer'; 
            ptr.textContent = '👆';
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
        if (this.tutorialStep === 30) {
            this.scriptedHint("了解"); this.hintIndex++; this.updateHintButton();
            this.tutorialStep = 31; this.updateTutorialUI(); return;
        }
        if (this.tutorialStep === 37) {
            this.scriptedHint("點選"); this.hintIndex++; this.updateHintButton();
            this.tutorialStep = 38; this.updateTutorialUI(); return;
        }

        if(Data.keys < 1) return NPC.say("蠟燭不足，提示需要 1 根蠟燭。");
        
        const lvl = this.getLevelData(this.currentLevelIdx);
        if (!lvl || this.hintIndex >= lvl.sols.length) return;

        Data.keys -= 1; Data.save(); App.updateUI();
        
        const word = lvl.sols[this.hintIndex];
        this.scriptedHint(word);
        
        this.hintIndex++;
        this.updateHintButton();
    },

    scriptedHint(word) {
        const area = document.getElementById('hint-result-area');
        if(area) {
            const span = document.createElement('span');
            span.textContent = "提示: " + word; span.style.display = 'block';
            area.appendChild(span);
        }
    },

    checkAnswer() {
        if (this.tutorialStep > 0 && this.tutorialStep !== 23 && this.tutorialStep !== 47) return;
        const pool = document.getElementById('character-pool');
        if(pool.children.length > 0) return Modal.show("提示", "請將磚塊全部砌上！");
        
        let player = [];
        document.querySelectorAll('#answer-grid > div').forEach(row => {
            let w = "";
            row.querySelectorAll('.drop-zone').forEach(z => { if(z.firstChild) w += z.firstChild.textContent; });
            player.push(w);
        });
        
        const lvl = this.getLevelData(this.currentLevelIdx);

        if(player.sort().join(',') === [...lvl.sols].sort().join(',')) {
            Data.coins += 1; 
            if(this.currentLevelIdx >= Data.unlockedLevel) Data.unlockedLevel = this.currentLevelIdx + 1;
            Data.save();

            if (this.tutorialStep === 23) { this.tutorialStep = 24; this.clearTutorialHighlights(); }
            if (this.tutorialStep === 47) { this.tutorialStep = 0; this.clearTutorialHighlights(); }

            const showVictory = () => {
                const adiv = document.getElementById('modal-actions'); adiv.innerHTML = '';
                
                const b1 = document.createElement('button'); b1.className = 'btn-secondary w-full mb-2';
                b1.textContent = '查看詞語';
                b1.onclick = () => {
                    if(this.tutorialStep === 24) { this.tutorialStep = 25; this.updateTutorialUI(); }
                    showVocab();
                };

                const b2 = document.createElement('button'); b2.className = 'btn-primary w-full';
                b2.textContent = '下一關';
                b2.onclick = () => {
                    if(this.tutorialStep >= 24 && this.tutorialStep < 27) return;
                    if(this.tutorialStep === 27) { this.tutorialStep = 0; this.clearTutorialHighlights(); }
                    
                    Modal.close();

                    const nextAction = () => {
                        if(this.currentLevelIdx < 1999) Game.startLevel(this.currentLevelIdx + 1); 
                        else {
                            Modal.show("全破", "恭喜你！完成了所有國度的試煉！", "太強了");
                            App.showLevels();
                        }
                    };

                    if (this.currentLevelIdx > 0 && (this.currentLevelIdx + 1) % 3 === 0) {
                        AdController.showInterstitialAd(nextAction);
                    } else {
                        nextAction();
                    }
                };
                adiv.appendChild(b1); adiv.appendChild(b2);
                
                let msg = "恭喜！獲得紀念金幣: 🪙 +1";
                if (this.currentLevelIdx === 0) msg = "過關後，別急著走！\n我們可以將學到的詞語記錄下來。";
                Modal.show2("修築完成", msg);
                if(this.tutorialStep === 24 || this.tutorialStep === 27) this.updateTutorialUI();
            };

            const showVocab = () => {
                const c = document.createElement('div'); c.style.cssText = "text-align:left; max-height:250px; overflow-y:auto;";
                const saved = JSON.parse(localStorage.getItem('zyramid_notebook')||'{}');

                lvl.sols.forEach(w => {
                    const info = lvl.details[w] || {def:'-', ex:''};
                    const row = document.createElement('div'); row.className = 'vocab-row';
                    const txt = document.createElement('div');
                    txt.innerHTML = `<div class="font-bold text-lg text-stone-800">【${w}】</div><div class="text-sm text-stone-600 mb-1">${info.def}</div>`;
                    
                    const btn = document.createElement('button'); btn.className = 'heart-btn';
                    btn.textContent = '❤';
                    if(saved[w]) btn.classList.add('saved');

                    btn.onclick = () => {
                        if(this.tutorialStep === 25) {
                            this.tutorialStep = 26; this.clearTutorialHighlights();
                            NPC.say("太棒了！點擊愛心，就可以將詞語加入筆記本。\n現在點擊『返回』，然後前往下一關吧。", "返回", () => {
                                this.tutorialStep = 26; showVocab(); 
                            });
                        }
                        const cur = JSON.parse(localStorage.getItem('zyramid_notebook')||'{}');
                        if(cur[w]) { delete cur[w]; btn.classList.remove('saved'); }
                        else { cur[w] = info; btn.classList.add('saved'); }
                        localStorage.setItem('zyramid_notebook', JSON.stringify(cur));
                    };
                    row.appendChild(txt); row.appendChild(btn); c.appendChild(row);
                });
                if (this.tutorialStep === 26) {
                    Modal.show("本關字彙", c, "返回", "📖", () => { this.tutorialStep = 27; showVictory(); });
                    setTimeout(() => this.updateTutorialUI(), 200);
                } else {
                    Modal.show("本關字彙", c, "返回", "📖", () => showVictory());
                }
                if(this.tutorialStep === 25) setTimeout(() => this.updateTutorialUI(), 200);
            };
            showVictory();

        } else { Modal.show("結構錯誤", "詞語組合不對，\n塔身不穩，請重新調整！", "重試"); }
    },

    handleClick(e) {
        if(!document.getElementById('view-game').classList.contains('active')) return;
        
        if (Game.tutorialStep > 0 && Game.tutorialStep < 47) {
            const t = e.target.closest('.char-tile');
            const z = e.target.closest('.drop-zone');
            const towers = document.getElementById('answer-grid').children;
            let valid = false;

            // 第一關
            if (Game.tutorialStep === 1 && t && t.textContent.trim() === '希') valid = true;
            else if (Game.tutorialStep === 2 && z === towers[0].children[1]) valid = true;
            else if (Game.tutorialStep === 3 && t && t.textContent.trim() === '望') valid = true;
            else if (Game.tutorialStep === 4 && z === towers[0].children[2]) valid = true;
            else if (Game.tutorialStep === 6 && t && t.textContent.trim() === '游') valid = true;
            else if (Game.tutorialStep === 7 && z === towers[2].children[1]) valid = true;
            else if (Game.tutorialStep === 8 && t && t.textContent.trim() === '泳') valid = true;
            else if (Game.tutorialStep === 9 && z === towers[2].children[2]) valid = true;
            else if (Game.tutorialStep === 13 && t && t.textContent.trim() === '游') valid = true;
            else if (Game.tutorialStep === 14 && z === towers[1].children[1]) valid = true;
            else if (Game.tutorialStep === 15 && t && t.textContent.trim() === '泳') valid = true;
            else if (Game.tutorialStep === 16 && z === towers[1].children[2]) valid = true;
            else if (Game.tutorialStep === 17 && t && t.textContent.trim() === '池') valid = true;
            else if (Game.tutorialStep === 18 && z === towers[1].children[3]) valid = true;
            else if (Game.tutorialStep === 19 && t && t.textContent.trim() === '吃') valid = true;
            else if (Game.tutorialStep === 20 && z === towers[2].children[1]) valid = true;
            else if (Game.tutorialStep === 21 && t && t.textContent.trim() === '飯') valid = true;
            else if (Game.tutorialStep === 22 && z === towers[2].children[2]) valid = true;
            else if (Game.tutorialStep === 23) valid = true; 

            // 第二關
            else if (Game.tutorialStep === 30) valid = true;
            else if (Game.tutorialStep === 32 && t && t.textContent.trim() === '了') valid = true;
            else if (Game.tutorialStep === 33 && z === towers[0].children[1]) valid = true;
            else if (Game.tutorialStep === 34 && t && t.textContent.trim() === '解') valid = true;
            else if (Game.tutorialStep === 35 && z === towers[0].children[2]) valid = true;
            else if (Game.tutorialStep === 37) valid = true;
            else if (Game.tutorialStep === 38 && t && t.textContent.trim() === '點') valid = true;
            else if (Game.tutorialStep === 39 && z === towers[1].children[1]) valid = true;
            else if (Game.tutorialStep === 40 && t && t.textContent.trim() === '選') valid = true;
            else if (Game.tutorialStep === 41 && z === towers[1].children[2]) valid = true;
            else if (Game.tutorialStep === 43 && t && t.textContent.trim() === '詢') valid = true;
            else if (Game.tutorialStep === 44 && z === towers[2].children[1]) valid = true;
            else if (Game.tutorialStep === 45 && t && t.textContent.trim() === '問') valid = true;
            else if (Game.tutorialStep === 46 && z === towers[2].children[2]) valid = true;
            else if (Game.tutorialStep === 47) valid = true;

            if (!valid) return;
        }

        const tile = e.target.closest('.char-tile');
        if (tile) {
            if (tile.parentElement.classList.contains('drop-zone')) {
                document.getElementById('character-pool').appendChild(tile);
                tile.classList.remove('selected'); Game.selectedTile = null;
            } else {
                if (tile.classList.contains('selected')) { tile.classList.remove('selected'); Game.selectedTile = null; }
                else { 
                    if (Game.selectedTile) Game.selectedTile.classList.remove('selected'); 
                    tile.classList.add('selected'); Game.selectedTile = tile; 
                }
            }
        } else {
            const zone = e.target.closest('.drop-zone');
            if (zone && Game.selectedTile && !zone.hasChildNodes()) { 
                zone.appendChild(Game.selectedTile); 
                Game.selectedTile.classList.remove('selected'); Game.selectedTile = null; 
            }
        }
        
        // 自動推進教學
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
