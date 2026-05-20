const basePath = "/3Care/chi/gamify/pet-game";

export const gameConfig = {
    basePath,
    campaignID: "pet-game",

    sounds: {
        // Background music
        background: {
            path: `${basePath}/sounds/background.mp3`,
            volume: 0.5,
        },

        // Game effect sounds
        effects: {
            gameOver: {
                path: `${basePath}/sounds/gameover-clipped.mp3`,
                volume: 1.0,
            },
            pause: {
                path: `${basePath}/sounds/pause.mp3`,
                volume: 1.0,
            },
            match: {
                path: `${basePath}/sounds/eliminate.mp3`,
                volume: 1.0,
            },
            swap: {
                path: `${basePath}/sounds/swap-clipped.mp3`,
                volume: 1.0,
            },
            spawn: {
                path: `${basePath}/sounds/spawn.mp3`,
                volume: 1.0,
            },
        },

            // Combo sounds (note: currently empty files, need actual audio content)
        combo: {
            x2: {
                path: `${basePath}/sounds/combo-x2.mp3`,
                volume: 1.0,
            },
            x3: {
                path: `${basePath}/sounds/combo-x3.mp3`,
                volume: 1.0,
            },
            x4: {
                path: `${basePath}/sounds/combo-x4.mp3`,
                volume: 1.0,
            },
            super: {
                path: `${basePath}/sounds/combo-super.mp3`,
                volume: 1.0,
            },
        },
    },

    // ==========================================
    // VISUAL ASSETS CONFIGURATION
    // ==========================================
    chi: {
        assets: {
            // UI images
            ui: {
                primaryBtn: `${basePath}/images/primary_btn.png`,
                modalTop: `${basePath}/images/modal_top.png`,
                modalButtom: `${basePath}/images/modal_bottom.png`,
                modalCenter: `${basePath}/images/modal_center.png`,

                // home screen
                homeBG: `${basePath}/images/home_bg.png`,
                pet: `${basePath}/images/pet.png`,
                coinIcon: `${basePath}/images/coin_icon.png`,
                feedGameIcon: `${basePath}/images/feed_game_icon.png`,
                walkGameIcon: `${basePath}/images/walk_game_icon.png`,
                spaGameIcon: `${basePath}/images/spa_game_icon.png`,
                poop: `${basePath}/images/poop.png`,
                feedGameTaskIcon: `${basePath}/images/feed_game_task_icon.png`,
                walkGameTaskIcon: `${basePath}/images/walk_game_task_icon.png`,
                spaGameTaskIcon: `${basePath}/images/spa_game_task_icon.png`,
                taskTickIcon: `${basePath}/images/task-tick.png`,
                timerIcon: `${basePath}/images/timer-icon.svg`,
                purpleLine: `${basePath}/images/purple_line.svg`,

                // Feed game
                feedGameBackground: `${basePath}/images/feed_game_bg.png`,
                feedGamePumpkin: `${basePath}/images/feed_game_pumpkin.png`,
                feedGameBroccoli: `${basePath}/images/feed_game_broccoli.png`,
                feedGameEgg: `${basePath}/images/feed_game_egg.png`,
                feedGameSalmon: `${basePath}/images/feed_game_salmon.png`,
                feedGameDogKibble: `${basePath}/images/feed_game_dog_kibble.png`,
                feedGameRice: `${basePath}/images/feed_game_rice.png`,
                feedGameOptionBox: `${basePath}/images/feed_game_option_box.png`,
                feedGameOptionBoxCorrect: `${basePath}/images/feed_game_option_box_correct.png`,
                feedGameOptionBoxWrong: `${basePath}/images/feed_game_option_box_wrong.png`,
                feedGameMsgBox: `${basePath}/images/feed_game_msg_box.png`,
                feedGameFailText: `${basePath}/images/feed_game_fail_text.png`,
                feedGameHeartBox: `${basePath}/images/feed_game_heart_box.png`,
                feedGameHeart: `${basePath}/images/feed_game_heart.png`,
                feedGamePointBox: `${basePath}/images/feed_game_point_box.png`,
                feedGameTimerBox: `${basePath}/images/feed_game_timer_box.png`,
                feedGameTimeUpText: `${basePath}/images/feed_game_tiemup_text.png`,
                feedGameThinkingBubble: `${basePath}/images/feed_game_thinking_bubble.png`,
                feedGameTimeoutDog: `${basePath}/images/feed_game_timeout_dog.png`,
                feedGameFinishDog: `${basePath}/images/feed_game_finish_dog.png`,
                feedGameBeginDog: `${basePath}/images/feed_game_begin_dog.png`,
                feedGamePlus10Text: `${basePath}/images/feed_game_plus_10_text.png`,
            },
        },
    },
    
    eng: {
        assets: {
            // UI images
            ui: {
                primaryBtn: `${basePath}/images/primary_btn.png`,
                modalTop: `${basePath}/images/modal_top.png`,
                modalButtom: `${basePath}/images/modal_bottom.png`,
                modalCenter: `${basePath}/images/modal_center.png`,

                // Home screen
                homeBG: `${basePath}/images/home_bg.png`,
                pet: `${basePath}/images/pet.png`,
                coinIcon: `${basePath}/images/coin_icon.png`,
                feedGameIcon: `${basePath}/images/feed_game_icon.png`,
                walkGameIcon: `${basePath}/images/walk_game_icon.png`,
                spaGameIcon: `${basePath}/images/spa_game_icon.png`,
                poop: `${basePath}/images/poop.png`,
                feedGameTaskIcon: `${basePath}/images/feed_game_task_icon.png`,
                walkGameTaskIcon: `${basePath}/images/walk_game_task_icon.png`,
                spaGameTaskIcon: `${basePath}/images/spa_game_task_icon.png`,
                taskTickIcon: `${basePath}/images/task-tick.png`,
                timerIcon: `${basePath}/images/timer-icon.svg`,
                purpleLine: `${basePath}/images/purple_line.svg`,

                // Feed game
                feedGameBackground: `${basePath}/images/feed_game_bg.png`,
                feedGamePumpkin: `${basePath}/images/feed_game_pumpkin.png`,
                feedGameBroccoli: `${basePath}/images/feed_game_broccoli.png`,
                feedGameEgg: `${basePath}/images/feed_game_egg.png`,
                feedGameSalmon: `${basePath}/images/feed_game_salmon.png`,
                feedGameDogKibble: `${basePath}/images/feed_game_dog_kibble.png`,
                feedGameRice: `${basePath}/images/feed_game_rice.png`,
                feedGameOptionBox: `${basePath}/images/feed_game_option_box.png`,
                feedGameOptionBoxCorrect: `${basePath}/images/feed_game_option_box_correct.png`,
                feedGameOptionBoxWrong: `${basePath}/images/feed_game_option_box_wrong.png`,
                feedGameMsgBox: `${basePath}/images/feed_game_msg_box.png`,
                feedGameFailText: `${basePath}/images/feed_game_fail_text.png`,
                feedGameHeartBox: `${basePath}/images/feed_game_heart_box.png`,
                feedGameHeart: `${basePath}/images/feed_game_heart.png`,
                feedGamePointBox: `${basePath}/images/feed_game_point_box.png`,
                feedGameTimerBox: `${basePath}/images/feed_game_timer_box.png`,
                feedGameTimeUpText: `${basePath}/images/feed_game_tiemup_text.png`,
                feedGameThinkingBubble: `${basePath}/images/feed_game_thinking_bubble.png`,
                feedGameTimeoutDog: `${basePath}/images/feed_game_timeout_dog.png`,
                feedGameFinishDog: `${basePath}/images/feed_game_finish_dog.png`,
                feedGameBeginDog: `${basePath}/images/feed_game_begin_dog.png`,
                feedGamePlus10Text: `${basePath}/images/feed_game_plus_10_text.png`,
            },
        },
    },
};