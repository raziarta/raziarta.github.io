// === AUDIO.JS - High Quality Shoegaze BGM & Pro SE ===
const AudioManager = {
  initialized:false, bgmPlaying:null, masterVol:null,
  roadParts:{}, tutorialParts:{}, bossParts:{}, abyssParts:{}, lastBossParts:{}, sePool:{},

  async init() {
    if(this.initialized) return;
    await Tone.start(); this.initialized=true;
    this.masterVol=new Tone.Volume(-5).toDestination();
    this.lpf = new Tone.Filter(20000, "lowpass").connect(this.masterVol);
    const rev=new Tone.Reverb({decay:5,wet:0.4}).connect(this.lpf);
    const bRev=new Tone.Reverb({decay:2.5,wet:0.25}).connect(this.lpf);
    const dly=new Tone.FeedbackDelay({delayTime:'8n.',feedback:0.35,wet:0.22}).connect(rev);
    const chr=new Tone.Chorus({frequency:1.2,delayTime:4,depth:0.65,wet:0.3}).connect(rev);
    const dist=new Tone.Distortion({distortion:0.45,wet:0.18}).connect(bRev);
    
    const bgm = AssetLoader.data.audio.bgm;
    Tone.Transport.bpm.value = bgm.road.bpm;

    // === Road BGM ===
    const pad=new Tone.PolySynth(Tone.Synth,{maxPolyphony:8,options:{oscillator:{type:'sine4'},envelope:{attack:1.8,decay:2.5,sustain:0.55,release:3.5},volume:-17}}).connect(chr);
    const padChords = bgm.road.padChords;
    const padL=new Tone.Sequence((t,i)=>{pad.triggerAttackRelease(padChords[i],'1m',t,0.35);},[0,1,2,3,4,5,6,7],'1m');

    // Vocal-like synth (shoegaze voice)
    const vocal=new Tone.Synth({oscillator:{type:'sine8'},envelope:{attack:0.5,decay:1,sustain:0.4,release:2},volume:-14}).connect(new Tone.Vibrato({frequency:5,depth:0.15}).connect(rev));
    const vocNotes = bgm.road.vocNotes;
    const vocL=new Tone.Sequence((t,n)=>{if(n)vocal.triggerAttackRelease(n,'2n',t,0.35)},vocNotes,'4n');

    const lead=new Tone.Synth({oscillator:{type:'triangle8'},envelope:{attack:0.06,decay:0.35,sustain:0.25,release:1.4},volume:-13}).connect(dly);
    const melNotes = bgm.road.melNotes;
    const melL=new Tone.Sequence((t,n)=>{if(n)lead.triggerAttackRelease(n,'8n',t,0.55)},melNotes,'8n');

    const bass=new Tone.MonoSynth({oscillator:{type:'sine'},envelope:{attack:0.04,decay:0.3,sustain:0.65,release:0.5},filterEnvelope:{attack:0.05,decay:0.2,sustain:0.5,release:0.5,baseFrequency:80,octaves:2.5},volume:-10}).connect(rev);
    const bassN = bgm.road.bassNotes;
    const bassL=new Tone.Sequence((t,n)=>{if(n)bass.triggerAttackRelease(n,'4n',t,0.65)},bassN,'8n');

    const kick=new Tone.MembraneSynth({pitchDecay:0.04,octaves:7,envelope:{attack:0.001,decay:0.28,sustain:0,release:0.25},volume:-7}).connect(rev);
    const snare=new Tone.NoiseSynth({noise:{type:'pink'},envelope:{attack:0.001,decay:0.13,sustain:0,release:0.08},volume:-13}).connect(rev);
    const hat=new Tone.MetalSynth({frequency:420,envelope:{attack:0.001,decay:0.055,release:0.01},harmonicity:5.1,modulationIndex:32,resonance:4200,octaves:1.5,volume:-21}).connect(rev);
    const drumL=new Tone.Sequence((t,v)=>{if(v==='k')kick.triggerAttackRelease('C1','16n',t,0.65);else if(v==='s')snare.triggerAttackRelease('16n',t,0.35);else if(v==='h')hat.triggerAttackRelease('32n',t,0.22)},bgm.road.drumPattern,'8n');

    const noise=new Tone.Noise({type:'pink',volume:-38}).connect(new Tone.AutoFilter({frequency:'2m',baseFrequency:180,octaves:4}).connect(rev).start());
    this.roadParts={loops:[padL,vocL,melL,bassL,drumL],noise,synths:[pad,vocal,lead,bass,kick,snare,hat]};
    
    // === Tutorial BGM ===
    const tBgm = AssetLoader.data.audio.bgm.tutorial;
    const tPadL=new Tone.Sequence((t,i)=>{pad.triggerAttackRelease(tBgm.padChords[i],'1m',t,0.35);},[0,1,2,3],'1m');
    const tVocL=new Tone.Sequence((t,n)=>{if(n)vocal.triggerAttackRelease(n,'2n',t,0.35)},tBgm.vocNotes,'4n');
    const tMelL=new Tone.Sequence((t,n)=>{if(n)lead.triggerAttackRelease(n,'8n',t,0.55)},tBgm.melNotes,'8n');
    const tBassL=new Tone.Sequence((t,n)=>{if(n)bass.triggerAttackRelease(n,'4n',t,0.65)},tBgm.bassNotes,'8n');
    const tDrumL=new Tone.Sequence((t,v)=>{if(v==='k')kick.triggerAttackRelease('C1','16n',t,0.65);else if(v==='s')snare.triggerAttackRelease('16n',t,0.35);else if(v==='h')hat.triggerAttackRelease('32n',t,0.22)},tBgm.drumPattern,'8n');
    this.tutorialParts={loops:[tPadL,tVocL,tMelL,tBassL,tDrumL]};

    // === Abyss BGM (Stage 4-6) ===
    const aPad = new Tone.PolySynth(Tone.Synth, {oscillator: {type: 'sine2'}, envelope: {attack: 3, decay: 4, sustain: 0.6, release: 5}, volume: -3}).connect(rev);
    const aPadChords = bgm.abyss.padChords;
    const aPadL = new Tone.Sequence((t, i) => { aPad.triggerAttackRelease(aPadChords[i], '4m', t, 0.4); }, [0, 1, 2, 3], '4m');
    
    const aLead = new Tone.Synth({oscillator: {type: 'sine'}, envelope: {attack: 0.5, decay: 2, sustain: 0.1, release: 3}, volume: 0}).connect(new Tone.FeedbackDelay({delayTime: '2n', feedback: 0.6, maxDelay: 2}).connect(rev));
    const aLeadN = bgm.abyss.leadNotes;
    const aLeadL = new Tone.Sequence((t, n) => { if (n) aLead.triggerAttackRelease(n, '1m', t, 0.3); }, aLeadN, '2n');

    const aKick = new Tone.MembraneSynth({pitchDecay: 0.05, octaves: 4, envelope: {attack: 0.01, decay: 0.4, sustain: 0, release: 0.4}, volume: 5}).connect(this.lpf);
    const aDrumL = new Tone.Sequence((t) => { aKick.triggerAttackRelease('C1', '8n', t, 0.5); }, ['k', null, null, null, null, null, null, null], '4n');
    this.abyssParts = {loops: [aPadL, aLeadL, aDrumL], synths: [aPad, aLead, aKick]};

    // === Boss BGM ===
    const bLead=new Tone.Synth({oscillator:{type:'sawtooth8'},envelope:{attack:0.01,decay:0.12,sustain:0.45,release:0.25},volume:-13}).connect(dist);
    const bBass=new Tone.MonoSynth({oscillator:{type:'sawtooth'},envelope:{attack:0.01,decay:0.18,sustain:0.55,release:0.25},filterEnvelope:{attack:0.02,decay:0.12,sustain:0.35,release:0.25,baseFrequency:55,octaves:3.5},volume:-7}).connect(dist);
    const bKick=new Tone.MembraneSynth({pitchDecay:0.03,octaves:8,envelope:{attack:0.001,decay:0.22,sustain:0,release:0.18},volume:-5}).connect(bRev);
    const bSnare=new Tone.NoiseSynth({noise:{type:'white'},envelope:{attack:0.001,decay:0.1,sustain:0,release:0.06},volume:-9}).connect(bRev);
    const bLeadN = bgm.boss.leadNotes;
    const bLeadL=new Tone.Sequence((t,n)=>{if(n)bLead.triggerAttackRelease(n,'16n',t,0.65)},bLeadN,'16n');
    const bBassN = bgm.boss.bassNotes;
    const bBassL=new Tone.Sequence((t,n)=>{if(n)bBass.triggerAttackRelease(n,'8n',t,0.75)},bBassN,'8n');
    const bDrumL=new Tone.Sequence((t,v)=>{if(v==='k')bKick.triggerAttackRelease('C1','16n',t,0.85);else if(v==='s')bSnare.triggerAttackRelease('16n',t,0.55);else if(v==='b'){bKick.triggerAttackRelease('C1','16n',t,0.65);bSnare.triggerAttackRelease('16n',t,0.25);}},bgm.boss.drumPattern,'8n');
    this.bossParts={loops:[bLeadL,bBassL,bDrumL],synths:[bLead,bBass,bKick,bSnare]};

    // === Last Boss BGM (Null) ===
    const nDist = new Tone.Distortion(0.8).connect(this.masterVol);
    const nLead = new Tone.Synth({oscillator: {type: 'square4'}, envelope: {attack: 0.005, decay: 0.1, sustain: 0.2, release: 0.1}, volume: -13}).connect(nDist);
    const nLeadN = bgm.null.leadNotes;
    const nLeadL = new Tone.Sequence((t, n) => { if (n) nLead.triggerAttackRelease(n, '16n', t, 0.8); }, nLeadN, '16n');
    
    const nNoise = new Tone.NoiseSynth({noise: {type: 'white'}, envelope: {attack: 0.001, decay: 0.05, sustain: 0, release: 0.02}, volume: -10}).connect(nDist);
    const nDrumL = new Tone.Sequence((t, v) => { if (v) nNoise.triggerAttackRelease('32n', t, 0.6); }, bgm.null.drumPattern, '16n');
    this.lastBossParts = {loops: [nLeadL, nDrumL], synths: [nLead, nNoise]};

    // === Sky BGM (Stage 7) ===
    const sPad = new Tone.PolySynth(Tone.Synth, {oscillator: {type: 'triangle4'}, envelope: {attack: 2, decay: 3, sustain: 0.5, release: 4}, volume: -12}).connect(chr);
    const sPadC = bgm.sky.padChords;
    const sPadL = new Tone.Sequence((t, i) => { sPad.triggerAttackRelease(sPadC[i], '2m', t, 0.35); }, [0, 1, 2, 3], '2m');
    const sLead = new Tone.Synth({oscillator: {type: 'sine4'}, envelope: {attack: 0.1, decay: 0.8, sustain: 0.3, release: 1.5}, volume: -10}).connect(dly);
    const sLeadL = new Tone.Sequence((t, n) => { if (n) sLead.triggerAttackRelease(n, '4n', t, 0.5); }, bgm.sky.leadNotes, '8n');
    const sBass = new Tone.MonoSynth({oscillator: {type: 'triangle'}, envelope: {attack: 0.05, decay: 0.3, sustain: 0.5, release: 0.5}, filterEnvelope: {attack: 0.05, decay: 0.2, sustain: 0.4, release: 0.5, baseFrequency: 60, octaves: 2}, volume: -8}).connect(rev);
    const sBassL = new Tone.Sequence((t, n) => { if (n) sBass.triggerAttackRelease(n, '4n', t, 0.6); }, bgm.sky.bassNotes, '8n');
    const sDrumL = new Tone.Sequence((t, v) => { if(v==='k')kick.triggerAttackRelease('C1','16n',t,0.5);else if(v==='s')snare.triggerAttackRelease('16n',t,0.3);else if(v==='h')hat.triggerAttackRelease('32n',t,0.18); }, bgm.sky.drumPattern, '8n');
    this.skyParts = {loops: [sPadL, sLeadL, sBassL, sDrumL], synths: [sPad, sLead, sBass]};

    // === Ocean BGM (Stage 8) ===
    const oPad = new Tone.PolySynth(Tone.Synth, {oscillator: {type: 'sine2'}, envelope: {attack: 4, decay: 5, sustain: 0.7, release: 6}, volume: -8}).connect(rev);
    const oPadC = bgm.ocean.padChords;
    const oPadL = new Tone.Sequence((t, i) => { oPad.triggerAttackRelease(oPadC[i], '4m', t, 0.3); }, [0, 1, 2, 3], '4m');
    const oLead = new Tone.Synth({oscillator: {type: 'sine'}, envelope: {attack: 0.8, decay: 2, sustain: 0.2, release: 3}, volume: -5}).connect(new Tone.FeedbackDelay({delayTime: '2n', feedback: 0.5, maxDelay: 3}).connect(rev));
    const oLeadL = new Tone.Sequence((t, n) => { if (n) oLead.triggerAttackRelease(n, '1m', t, 0.35); }, bgm.ocean.leadNotes, '4n');
    const oBass = new Tone.MonoSynth({oscillator: {type: 'sine'}, envelope: {attack: 0.1, decay: 0.5, sustain: 0.6, release: 1}, filterEnvelope: {attack: 0.1, decay: 0.3, sustain: 0.4, release: 0.5, baseFrequency: 40, octaves: 2}, volume: -6}).connect(this.lpf);
    const oBassL = new Tone.Sequence((t, n) => { if (n) oBass.triggerAttackRelease(n, '2n', t, 0.5); }, bgm.ocean.bassNotes, '4n');
    const oDrumL = new Tone.Sequence((t, v) => { if(v==='k')kick.triggerAttackRelease('C1','8n',t,0.35); }, bgm.ocean.drumPattern, '4n');
    this.oceanParts = {loops: [oPadL, oLeadL, oBassL, oDrumL], synths: [oPad, oLead, oBass]};

    // === Core BGM (Stage 9) ===
    const cPad = new Tone.PolySynth(Tone.Synth, {oscillator: {type: 'sawtooth4'}, envelope: {attack: 1, decay: 2, sustain: 0.4, release: 2}, volume: -14}).connect(dist);
    const cPadC = bgm.core.padChords;
    const cPadL = new Tone.Sequence((t, i) => { cPad.triggerAttackRelease(cPadC[i], '1m', t, 0.35); }, [0, 1, 2, 3], '1m');
    const cLead = new Tone.Synth({oscillator: {type: 'square8'}, envelope: {attack: 0.02, decay: 0.15, sustain: 0.35, release: 0.3}, volume: -11}).connect(dist);
    const cLeadL = new Tone.Sequence((t, n) => { if (n) cLead.triggerAttackRelease(n, '8n', t, 0.6); }, bgm.core.leadNotes, '8n');
    const cBass = new Tone.MonoSynth({oscillator: {type: 'sawtooth'}, envelope: {attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.3}, filterEnvelope: {attack: 0.02, decay: 0.15, sustain: 0.3, release: 0.3, baseFrequency: 50, octaves: 3}, volume: -6}).connect(bRev);
    const cBassL = new Tone.Sequence((t, n) => { if (n) cBass.triggerAttackRelease(n, '4n', t, 0.7); }, bgm.core.bassNotes, '8n');
    const cDrumL = new Tone.Sequence((t, v) => { if(v==='k')kick.triggerAttackRelease('C1','16n',t,0.75);else if(v==='s')snare.triggerAttackRelease('16n',t,0.45);else if(v==='b'){kick.triggerAttackRelease('C1','16n',t,0.6);snare.triggerAttackRelease('16n',t,0.2);} }, bgm.core.drumPattern, '8n');
    this.coreParts = {loops: [cPadL, cLeadL, cBassL, cDrumL], synths: [cPad, cLead, cBass]};

    this.initSE();
  },

  initSE(){
    const sv=new Tone.Volume(-3).toDestination();
    const se = AssetLoader.data.audio.se;
    this.sePool={
      shoot:()=>{const s=new Tone.Synth({oscillator:{type:se.shoot.osc},envelope:{attack:se.shoot.attack,decay:se.shoot.decay,sustain:se.shoot.sustain,release:se.shoot.release},volume:se.shoot.vol}).connect(sv);s.triggerAttackRelease(se.shoot.note,'32n');setTimeout(()=>s.dispose(),200);},
      bombShoot:()=>{const s=new Tone.Synth({oscillator:{type:se.bombShoot.osc},envelope:{attack:se.bombShoot.attack,decay:se.bombShoot.decay,sustain:se.bombShoot.sustain,release:se.bombShoot.release},volume:se.bombShoot.vol}).connect(sv);s.triggerAttackRelease(se.bombShoot.note,'8n');setTimeout(()=>s.dispose(),300);},
      explosion:()=>{const s=new Tone.NoiseSynth({noise:{type:se.explosion.noise},envelope:{attack:0.001,decay:se.explosion.decay,sustain:se.explosion.sustain,release:se.explosion.release},volume:se.explosion.vol}).connect(sv);s.triggerAttackRelease('4n');const b=new Tone.Synth({oscillator:{type:'sine'},envelope:{attack:0.001,decay:0.2,sustain:0,release:0.1},volume:-6}).connect(sv);b.triggerAttackRelease(se.explosion.bassNote,'8n');setTimeout(()=>{s.dispose();b.dispose();},600);},
      jump:()=>{const s=new Tone.Synth({oscillator:{type:se.jump.osc},envelope:{attack:se.jump.attack,decay:se.jump.decay,sustain:se.jump.sustain,release:se.jump.release},volume:se.jump.vol}).connect(sv);s.triggerAttackRelease(se.jump.note,'16n');setTimeout(()=>s.dispose(),200);},
      land:()=>{const s=new Tone.NoiseSynth({noise:{type:se.land.noise},envelope:{attack:0.001,decay:se.land.decay,sustain:se.land.sustain,release:se.land.release},volume:se.land.vol}).connect(sv);s.triggerAttackRelease('32n');setTimeout(()=>s.dispose(),150);},
      damage:()=>{const s=new Tone.NoiseSynth({noise:{type:se.damage.noise},envelope:{attack:0.001,decay:se.damage.decay,sustain:se.damage.sustain,release:se.damage.release},volume:se.damage.vol}).connect(sv);s.triggerAttackRelease('16n');setTimeout(()=>s.dispose(),250);},
      enemyDie:()=>{const s=new Tone.NoiseSynth({noise:{type:se.enemyDie.noise},envelope:{attack:0.001,decay:se.enemyDie.decay,sustain:se.enemyDie.sustain,release:se.enemyDie.release},volume:se.enemyDie.vol}).connect(sv);s.triggerAttackRelease('8n');setTimeout(()=>s.dispose(),350);},
      itemGet:()=>{const s=new Tone.Synth({oscillator:{type:se.itemGet.osc},envelope:{attack:se.itemGet.attack,decay:se.itemGet.decay,sustain:se.itemGet.sustain,release:se.itemGet.release},volume:se.itemGet.vol}).connect(sv);s.triggerAttackRelease('E5','16n');setTimeout(()=>{s.triggerAttackRelease('A5','16n');setTimeout(()=>{s.triggerAttackRelease('C#6','8n');setTimeout(()=>s.dispose(),350);},70);},70);},
      canShoot:()=>{const s=new Tone.MetalSynth({frequency:se.canShoot.freq,envelope:{attack:se.canShoot.attack,decay:se.canShoot.decay,release:se.canShoot.release},volume:se.canShoot.vol}).connect(sv);s.triggerAttackRelease('32n');setTimeout(()=>s.dispose(),150);},
      bossIntro:()=>{const s=new Tone.Synth({oscillator:{type:se.bossIntro.osc},envelope:{attack:se.bossIntro.attack,decay:se.bossIntro.decay,sustain:se.bossIntro.sustain,release:se.bossIntro.release},volume:se.bossIntro.vol}).connect(sv);s.triggerAttackRelease(se.bossIntro.note,'2n');setTimeout(()=>s.dispose(),3500);},
      select:()=>{const s=new Tone.Synth({oscillator:{type:'sine'},envelope:{attack:0.01,decay:0.1,sustain:0,release:0.1},volume:-10}).connect(sv);s.triggerAttackRelease('C6','16n');setTimeout(()=>s.dispose(),200);},
      dive:()=>{const s=new Tone.NoiseSynth({noise:{type:'pink'},envelope:{attack:0.5,decay:1.5,sustain:0,release:0.1},volume:-5}).connect(sv);s.triggerAttackRelease('2n');setTimeout(()=>s.dispose(),2000);},
    };
  },

  playSE(n){if(!this.initialized)return;try{if(this.sePool[n])this.sePool[n]();}catch(e){}},
  startTutorialBGM(){if(!this.initialized||this.bgmPlaying==='tutorial')return;this.stopAll();const bgm=AssetLoader.data.audio.bgm;Tone.Transport.bpm.value=bgm.tutorial.bpm;this.tutorialParts.loops.forEach(l=>l.start(0));Tone.Transport.start();this.bgmPlaying='tutorial';},
  startRoadBGM(){if(!this.initialized||this.bgmPlaying==='road')return;this.stopAll();const bgm=AssetLoader.data.audio.bgm;Tone.Transport.bpm.value=bgm.road.bpm;this.roadParts.loops.forEach(l=>l.start(0));this.roadParts.noise.start();Tone.Transport.start();this.bgmPlaying='road';},
  startAbyssBGM(){if(!this.initialized||this.bgmPlaying==='abyss')return;this.stopAll();const bgm=AssetLoader.data.audio.bgm;Tone.Transport.bpm.value=bgm.abyss.bpm;this.abyssParts.loops.forEach(l=>l.start(0));Tone.Transport.start();this.bgmPlaying='abyss';},
  startBossBGM(){if(!this.initialized||this.bgmPlaying==='boss')return;this.stopAll();const bgm=AssetLoader.data.audio.bgm;Tone.Transport.bpm.value=bgm.boss.bpm;this.bossParts.loops.forEach(l=>l.start(0));Tone.Transport.start();this.bgmPlaying='boss';},
  startLastBossBGM(){if(!this.initialized||this.bgmPlaying==='lastboss')return;this.stopAll();const bgm=AssetLoader.data.audio.bgm;Tone.Transport.bpm.value=bgm.null.bpm;this.lastBossParts.loops.forEach(l=>l.start(0));Tone.Transport.start();this.bgmPlaying='lastboss';},
  startSkyBGM(){if(!this.initialized||this.bgmPlaying==='sky')return;this.stopAll();const bgm=AssetLoader.data.audio.bgm;Tone.Transport.bpm.value=bgm.sky.bpm;this.skyParts.loops.forEach(l=>l.start(0));Tone.Transport.start();this.bgmPlaying='sky';},
  startOceanBGM(){if(!this.initialized||this.bgmPlaying==='ocean')return;this.stopAll();const bgm=AssetLoader.data.audio.bgm;Tone.Transport.bpm.value=bgm.ocean.bpm;this.oceanParts.loops.forEach(l=>l.start(0));Tone.Transport.start();this.bgmPlaying='ocean';},
  startCoreBGM(){if(!this.initialized||this.bgmPlaying==='core')return;this.stopAll();const bgm=AssetLoader.data.audio.bgm;Tone.Transport.bpm.value=bgm.core.bpm;this.coreParts.loops.forEach(l=>l.start(0));Tone.Transport.start();this.bgmPlaying='core';},

  // === Ending BGM - melancholic but hopeful ===
  startEndingBGM(){
    if(!this.initialized||this.bgmPlaying==='ending')return;
    this.stopAll();
    Tone.Transport.bpm.value = 72;
    const rev = new Tone.Reverb({decay:6,wet:0.5}).toDestination();
    const dly = new Tone.FeedbackDelay({delayTime:'4n.',feedback:0.4,wet:0.3}).connect(rev);
    // Soft pad
    const ePad = new Tone.PolySynth(Tone.Synth,{oscillator:{type:'sine4'},envelope:{attack:3,decay:4,sustain:0.5,release:5},volume:-12}).connect(rev);
    const ePadChords = [['C4','E4','G4','B4'],['A3','C4','E4','G4'],['F3','A3','C4','E4'],['G3','B3','D4','F4']];
    const ePadL = new Tone.Sequence((t,i)=>{ePad.triggerAttackRelease(ePadChords[i],'2m',t,0.3);},[0,1,2,3],'2m');
    // Melody - gentle, wistful
    const eMel = new Tone.Synth({oscillator:{type:'sine'},envelope:{attack:0.3,decay:1.5,sustain:0.2,release:2},volume:-8}).connect(dly);
    const eMelNotes = ['E5','G5','B5','A5',null,'G5','E5','D5','C5',null,'D5','E5','G5',null,'A5','G5'];
    const eMelL = new Tone.Sequence((t,n)=>{if(n)eMel.triggerAttackRelease(n,'4n',t,0.4);},eMelNotes,'4n');
    // Bass - warm
    const eBass = new Tone.MonoSynth({oscillator:{type:'sine'},envelope:{attack:0.1,decay:0.5,sustain:0.6,release:1},filterEnvelope:{attack:0.1,decay:0.3,sustain:0.4,release:0.5,baseFrequency:60,octaves:1.5},volume:-6}).connect(rev);
    const eBassN = ['C3',null,null,null,'A2',null,null,null,'F2',null,null,null,'G2',null,null,null];
    const eBassL = new Tone.Sequence((t,n)=>{if(n)eBass.triggerAttackRelease(n,'2n',t,0.5);},eBassN,'4n');
    this.endingParts = {loops:[ePadL,eMelL,eBassL],synths:[ePad,eMel,eBass]};
    this.endingParts.loops.forEach(l=>l.start(0));
    Tone.Transport.start();
    this.bgmPlaying='ending';
  },

  // === Leviathan Boss BGM - heavy and epic ===
  startLeviathanBGM(){
    if(!this.initialized||this.bgmPlaying==='leviathan')return;
    this.stopAll();
    Tone.Transport.bpm.value = 155;
    const dist = new Tone.Distortion({distortion:0.5,wet:0.25}).connect(this.masterVol);
    const bRev = new Tone.Reverb({decay:2,wet:0.2}).connect(this.masterVol);
    // Aggressive lead
    const lLead = new Tone.Synth({oscillator:{type:'sawtooth8'},envelope:{attack:0.01,decay:0.1,sustain:0.4,release:0.2},volume:-11}).connect(dist);
    const lLeadN = ['E4','E4','G4','A4','B4','B4','A4','G4','E4','D4','E4',null,'B3','D4','E4','G4','A4','G4','E4','D4','C4','D4','E4',null,'G4','A4','B4','E5','D5','B4','A4','G4'];
    const lLeadL = new Tone.Sequence((t,n)=>{if(n)lLead.triggerAttackRelease(n,'16n',t,0.65);},lLeadN,'16n');
    // Heavy bass
    const lBass = new Tone.MonoSynth({oscillator:{type:'sawtooth'},envelope:{attack:0.02,decay:0.15,sustain:0.5,release:0.2},filterEnvelope:{attack:0.02,decay:0.1,sustain:0.3,release:0.2,baseFrequency:45,octaves:3},volume:-6}).connect(bRev);
    const lBassN = ['E2',null,'E2',null,'G2',null,'A2',null,'E2',null,'E2',null,'D2',null,'C2',null];
    const lBassL = new Tone.Sequence((t,n)=>{if(n)lBass.triggerAttackRelease(n,'8n',t,0.75);},lBassN,'8n');
    // Aggressive drums
    const lKick = new Tone.MembraneSynth({pitchDecay:0.03,octaves:8,envelope:{attack:0.001,decay:0.2,sustain:0,release:0.15},volume:-4}).connect(bRev);
    const lSnare = new Tone.NoiseSynth({noise:{type:'white'},envelope:{attack:0.001,decay:0.08,sustain:0,release:0.05},volume:-8}).connect(bRev);
    const lDrumP = ['k',null,'h','k','s',null,'h','k',null,'k','h','s','k',null,'k','s'];
    const lDrumL = new Tone.Sequence((t,v)=>{if(v==='k')lKick.triggerAttackRelease('C1','16n',t,0.85);else if(v==='s')lSnare.triggerAttackRelease('16n',t,0.55);else if(v==='h'){const h=new Tone.MetalSynth({frequency:420,envelope:{attack:0.001,decay:0.04,release:0.01},volume:-20}).connect(bRev);h.triggerAttackRelease('32n',t,0.2);setTimeout(()=>h.dispose(),200);}},lDrumP,'8n');
    this.leviathanParts = {loops:[lLeadL,lBassL,lDrumL],synths:[lLead,lBass,lKick,lSnare]};
    this.leviathanParts.loops.forEach(l=>l.start(0));
    Tone.Transport.start();
    this.bgmPlaying='leviathan';
  },

   // === Title BGM - Atmospheric & Epic Opening ===
  startTitleBGM() {
    if(!this.initialized || this.bgmPlaying === 'title') return;
    this.stopAll();
    Tone.Transport.bpm.value = 110;
    
    // 既に楽器が生成済みの場合は、再生だけ開始して終了
    if (this.titleParts) {
      this.titleParts.loops.forEach(l => l.start(0));
      Tone.Transport.start();
      this.bgmPlaying = 'title';
      return;
    }

    // --- 初回実行時のみ楽器を生成 ---
    const rev = new Tone.Reverb({decay:8, wet:0.5}).toDestination();
    const dly = new Tone.FeedbackDelay({delayTime:'4n.', feedback:0.4, wet:0.3}).connect(rev);
    
    const tPad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine4' },
      envelope: { attack: 4, decay: 3, sustain: 0.6, release: 5 },
      volume: -15
    }).connect(rev);
    const chords = [['C4','E4','G4','B4'], ['A3','C4','E4','G4'], ['F3','A3','C4','E4'], ['G3','B3','D4','F4']];
    const padL = new Tone.Sequence((t, i) => { 
      try { tPad.triggerAttackRelease(chords[i], '4m', t, 0.4); } catch(e) {}
    }, [0,1,2,3], '4m');

    const tLead = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.8, decay: 2, sustain: 0.2, release: 3 },
      volume: -8
    }).connect(dly);
    const mel = ['C5', 'E5', 'G5', 'B5', 'A5', 'G5', 'E5', 'D5'];
    const melL = new Tone.Sequence((t, n) => { 
      try { if(n) tLead.triggerAttackRelease(n, '2n', t, 0.35); } catch(e) {}
    }, mel, '1n');

    const tBass = new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.1, decay: 0.5, sustain: 0.8, release: 1 },
      volume: -10
    }).connect(rev);
    const bassN = ['C2', 'A1', 'F1', 'G1'];
    const bassL = new Tone.Sequence((t, n) => { 
      try { tBass.triggerAttackRelease(n, '2n', t, 0.5); } catch(e) {}
    }, bassN, '2n');

    this.titleParts = { loops: [padL, melL, bassL], synths: [tPad, tLead, tBass] };
    this.titleParts.loops.forEach(l => l.start(0));
    Tone.Transport.start();
    this.bgmPlaying = 'title';
    console.log("Start Title BGM");
  },


    stopAll() {
    try {
      Tone.Transport.stop();
      // 全てのBGMパートをリスト化して一括停止
      const partsList = [
        this.roadParts, this.tutorialParts, this.bossParts, this.abyssParts, 
        this.lastBossParts, this.skyParts, this.oceanParts, this.coreParts, 
        this.endingParts, this.leviathanParts, this.titleParts
      ];
      partsList.forEach(p => {
        if (!p) return;
        if (p.loops) p.loops.forEach(l => l.stop());
        if (p.noise) p.noise.stop();
        if (p.synths) {
          // 鳴り続けているシンセサイザーの音（リリース）を強制停止
          p.synths.forEach(s => {
            if (s.releaseAll) s.releaseAll();
            else if (s.triggerRelease) s.triggerRelease();
          });
        }
      });
      this.bgmPlaying = null;
      console.log("Stop BGM All");
    } catch (e) {
      console.warn("StopAll Error:", e);
    }
  },


  // Environmental SE
  playWindGust() {
    if (!this.initialized) return;
    try {
      const noise = new Tone.Noise({ type: 'pink', volume: -18 }).toDestination();
      const filter = new Tone.Filter(800, 'lowpass').toDestination();
      noise.connect(filter);
      noise.start();
      noise.stop('+1.5');
      filter.frequency.rampTo(200, 1.5);
    } catch(e) {}
  },

  playRumble() {
    if (!this.initialized) return;
    try {
      const rumble = new Tone.MembraneSynth({
        pitchDecay: 0.1, octaves: 4,
        envelope: { attack: 0.01, decay: 1.5, sustain: 0, release: 0.5 },
        volume: -12
      }).toDestination();
      rumble.triggerAttackRelease('C1', '1.5');
    } catch(e) {}
  },
};

