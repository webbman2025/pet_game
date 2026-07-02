const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export const gameConfig = {
    basePath,
    campaignID: "pet_game",

    /** Enforce on server (GamifyPetGameAcquirePoint.do / GamifyPetGameState.do) — not shown in UI. */
    backendMaxTotalPoints: 9_999_999_999,

    // Game reward placeholders — tune when product spec is finalized.
    rewards: {
        feed: {
            satisfactionPerCompletion: 5,
        },
        walk: {
            satisfactionPerCompletion: 5,
        },
        spa: {
            satisfactionPerCompletion: 5,
        },
    },

    sounds: {
        // Background music
        background: {
            path: `${basePath}/sounds/dogmusic.mp3`,
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
                secondaryBtn: `${basePath}/images/secondary_btn.png`,
                modalTop: `${basePath}/images/modal_top.png`,
                modalButtom: `${basePath}/images/modal_bottom.png`,
                modalCenter: `${basePath}/images/modal_center.png`,

                // home screen
                homeBG: `${basePath}/images/home_bg.png`,
                pet: `${basePath}/images/pet.png`,
                petVeryHappyDanceAnim: `${basePath}/images/pet_very_happy_dance_anim.gif`,
                petVeryHappyAnim: `${basePath}/images/pet_very_happy_anim.gif`,
                petHappyAnim: `${basePath}/images/pet_happy_anim.gif`,
                petNormalAnim: `${basePath}/images/pet_normal_anim.gif`,
                petBoringAnim: `${basePath}/images/pet_boring_anim.gif`,
                petUnhappyAnim: `${basePath}/images/pet_unhappy_anim.gif`,
                coinIcon: `${basePath}/images/coin_icon.png`,
                iconTutorial: `${basePath}/images/icon_tutorial.svg`,
                homeWelcomeTutorial: `${basePath}/images/welcomedog.png`,
                homeFeedingTimeTutorial: `${basePath}/images/feedingtime.png`,
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

                // Walk game (canvas engine still uses snowboard* keys; assets live in images/walk/)
                walkGameBackground: `${basePath}/images/walk_game_bg.png`,
                walkGameTokenFlight: `${basePath}/images/gamifyGame/token_flight.svg`,
                walkGameTutorialFrame: `${basePath}/images/spa_game_tutorial_frame.png`,
                walkGameTutorialPage1: `${basePath}/images/walk/walk_tutorial_page1.png`,
                walkGameTutorialPage2: `${basePath}/images/walk/walk_tutorial_page2.png`,
                walkGamePageDots1: `${basePath}/images/walk/walk_page_dots_1.png`,
                walkGamePageDots2: `${basePath}/images/walk/walk_page_dots_2.png`,
                snowboardBg: `${basePath}/images/walk/walk_bg_path.png`,
                snowboardBgForkGrass: `${basePath}/images/walk/walk_bg_fork_grass.png`,
                snowboardBgGrass: `${basePath}/images/walk/walk_bg_grass.png`,
                snowboardCenter: `${basePath}/images/walk/walk_dog.png`,
                snowboardLeft: `${basePath}/images/walk/walk_dog_left.png`,
                snowboardRight: `${basePath}/images/walk/walk_dog_right.png`,
                snowboardSupremeFlag: `${basePath}/images/walk/walk_finish.png`,
                snowboardWater: `${basePath}/images/walk/walk_obstacle_water.png`,
                snowboardTrap: `${basePath}/images/walk/walk_obstacle_poop.png`,
                snowboardStick: `${basePath}/images/walk/walk_obstacle_stick.png`,
                snowboardToken: `${basePath}/images/coin_icon.png`,
                snowboardClock: `${basePath}/images/walk/walk_obstacle_clock2s.png`,
                snowboardArrow: `${basePath}/images/snowboard/arrow.png`,
                snowboardArrowRight: `${basePath}/images/snowboard/arrow.png`,
                snowboardAdd5Point: `${basePath}/images/walk/walk_add5.png`,
                snowboardMinusHeart: `${basePath}/images/walk/walk_minusHeart.png`,
                snowboardTimesUp: `${basePath}/images/feed_game_tiemup_text.png`,
                walkForkFood: `${basePath}/images/walk/walk_fork_food.png`,
                walkForkBall: `${basePath}/images/walk/walk_fork_ball.png`,
                walkForkFriend: `${basePath}/images/walk/walk_fork_friend.png`,
                walkForkFriendHeart: `${basePath}/images/walk/walk_fork_friend_heart.png`,
                walkForkGiftBox: `${basePath}/images/walk/game_walk_giftbox.png`,
                walkBonusPointsText: `${basePath}/images/walk/walk_bonus_points_text.png`,
                walkPointsModalFriend: `${basePath}/images/walk/walk_points_modal_friend.png`,
                walkPointsModalBall: `${basePath}/images/walk/walk_points_modal_ball.png`,
                walkPointsModalFood: `${basePath}/images/walk/walk_points_modal_food.png`,

                // Spa game
                spaGameBackground: `${basePath}/images/spa_game_bg.png`,
                spaGameDog: `${basePath}/images/spa_game_dog.png`,
                spaGameDogSmile: `${basePath}/images/spa_game_dog_smile.png`,
                spaGameBubbleL: `${basePath}/images/spa_game_bubble_l.png`,
                spaGameBubbleS: `${basePath}/images/spa_game_bubble_s.png`,
                spaGameBubbleSRing: `${basePath}/images/spa_game_bubble_s_ring.png`,
                spaGameCleaningBar: `${basePath}/images/spa_game_cleaning_bar.png`,
                spaGameTutorialPreview: `${basePath}/images/spa_game_tutorial_preview.png`,
                spaGameTutorialFrame: `${basePath}/images/spa_game_tutorial_frame.png`,
                spaGameDogClean: `${basePath}/images/spa_game_dog_clean.png`,
                spaGameBlingL: `${basePath}/images/spa_game_bling_l.png`,
                spaGameBlingM: `${basePath}/images/spa_game_bling_m.png`,
                spaGameBlingS: `${basePath}/images/spa_game_bling_s.png`,
                spaGamePointsDog: `${basePath}/images/spa_game_points_dog.png`,
            },
        },
    },
    
    eng: {
        assets: {
            // UI images
            ui: {
                primaryBtn: `${basePath}/images/primary_btn.png`,
                secondaryBtn: `${basePath}/images/secondary_btn.png`,
                modalTop: `${basePath}/images/modal_top.png`,
                modalButtom: `${basePath}/images/modal_bottom.png`,
                modalCenter: `${basePath}/images/modal_center.png`,

                // Home screen
                homeBG: `${basePath}/images/home_bg.png`,
                pet: `${basePath}/images/pet.png`,
                petVeryHappyDanceAnim: `${basePath}/images/pet_very_happy_dance_anim.gif`,
                petVeryHappyAnim: `${basePath}/images/pet_very_happy_anim.gif`,
                petHappyAnim: `${basePath}/images/pet_happy_anim.gif`,
                petNormalAnim: `${basePath}/images/pet_normal_anim.gif`,
                petBoringAnim: `${basePath}/images/pet_boring_anim.gif`,
                petUnhappyAnim: `${basePath}/images/pet_unhappy_anim.gif`,
                coinIcon: `${basePath}/images/coin_icon.png`,
                iconTutorial: `${basePath}/images/icon_tutorial.svg`,
                homeWelcomeTutorial: `${basePath}/images/welcomedog.png`,
                homeFeedingTimeTutorial: `${basePath}/images/feedingtime.png`,
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

                // Walk game (canvas engine still uses snowboard* keys; assets live in images/walk/)
                walkGameBackground: `${basePath}/images/walk_game_bg.png`,
                walkGameTokenFlight: `${basePath}/images/gamifyGame/token_flight.svg`,
                walkGameTutorialFrame: `${basePath}/images/spa_game_tutorial_frame.png`,
                walkGameTutorialPage1: `${basePath}/images/walk/walk_tutorial_page1.png`,
                walkGameTutorialPage2: `${basePath}/images/walk/walk_tutorial_page2.png`,
                walkGamePageDots1: `${basePath}/images/walk/walk_page_dots_1.png`,
                walkGamePageDots2: `${basePath}/images/walk/walk_page_dots_2.png`,
                snowboardBg: `${basePath}/images/walk/walk_bg_path.png`,
                snowboardBgForkGrass: `${basePath}/images/walk/walk_bg_fork_grass.png`,
                snowboardBgGrass: `${basePath}/images/walk/walk_bg_grass.png`,
                snowboardCenter: `${basePath}/images/walk/walk_dog.png`,
                snowboardLeft: `${basePath}/images/walk/walk_dog_left.png`,
                snowboardRight: `${basePath}/images/walk/walk_dog_right.png`,
                snowboardSupremeFlag: `${basePath}/images/walk/walk_finish.png`,
                snowboardWater: `${basePath}/images/walk/walk_obstacle_water.png`,
                snowboardTrap: `${basePath}/images/walk/walk_obstacle_poop.png`,
                snowboardStick: `${basePath}/images/walk/walk_obstacle_stick.png`,
                snowboardToken: `${basePath}/images/coin_icon.png`,
                snowboardClock: `${basePath}/images/walk/walk_obstacle_clock2s.png`,
                snowboardArrow: `${basePath}/images/snowboard/arrow.png`,
                snowboardArrowRight: `${basePath}/images/snowboard/arrow.png`,
                snowboardAdd5Point: `${basePath}/images/walk/walk_add5.png`,
                snowboardMinusHeart: `${basePath}/images/walk/walk_minusHeart.png`,
                snowboardTimesUp: `${basePath}/images/feed_game_tiemup_text.png`,
                walkForkFood: `${basePath}/images/walk/walk_fork_food.png`,
                walkForkBall: `${basePath}/images/walk/walk_fork_ball.png`,
                walkForkFriend: `${basePath}/images/walk/walk_fork_friend.png`,
                walkForkFriendHeart: `${basePath}/images/walk/walk_fork_friend_heart.png`,
                walkForkGiftBox: `${basePath}/images/walk/game_walk_giftbox.png`,
                walkBonusPointsText: `${basePath}/images/walk/walk_bonus_points_text.png`,
                walkPointsModalFriend: `${basePath}/images/walk/walk_points_modal_friend.png`,
                walkPointsModalBall: `${basePath}/images/walk/walk_points_modal_ball.png`,
                walkPointsModalFood: `${basePath}/images/walk/walk_points_modal_food.png`,

                // Spa game
                spaGameBackground: `${basePath}/images/spa_game_bg.png`,
                spaGameDog: `${basePath}/images/spa_game_dog.png`,
                spaGameDogSmile: `${basePath}/images/spa_game_dog_smile.png`,
                spaGameBubbleL: `${basePath}/images/spa_game_bubble_l.png`,
                spaGameBubbleS: `${basePath}/images/spa_game_bubble_s.png`,
                spaGameBubbleSRing: `${basePath}/images/spa_game_bubble_s_ring.png`,
                spaGameCleaningBar: `${basePath}/images/spa_game_cleaning_bar.png`,
                spaGameTutorialPreview: `${basePath}/images/spa_game_tutorial_preview.png`,
                spaGameTutorialFrame: `${basePath}/images/spa_game_tutorial_frame.png`,
                spaGameDogClean: `${basePath}/images/spa_game_dog_clean.png`,
                spaGameBlingL: `${basePath}/images/spa_game_bling_l.png`,
                spaGameBlingM: `${basePath}/images/spa_game_bling_m.png`,
                spaGameBlingS: `${basePath}/images/spa_game_bling_s.png`,
                spaGamePointsDog: `${basePath}/images/spa_game_points_dog.png`,
            },
        },
    },
};