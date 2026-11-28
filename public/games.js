"use strict";
const toggle=document.querySelector(".menu-toggle");
const nav=document.querySelector("#nav");
if(toggle&&nav){toggle.addEventListener("click",()=>{const open=nav.classList.toggle("open");toggle.setAttribute("aria-expanded",String(open));});}
const tabs=[...document.querySelectorAll(".game-tab")];
const panels=[...document.querySelectorAll(".game-panel")];
function activateTab(tab,moveFocus=false){
  tabs.forEach(item=>{
    const active=item===tab;
    item.classList.toggle("active",active);
    item.setAttribute("aria-selected",String(active));
    item.tabIndex=active?0:-1;
  });
  panels.forEach(panel=>{
    const active=panel.id==="game-"+tab.dataset.game;
    panel.hidden=!active;
    panel.classList.toggle("active",active);
  });
  if(moveFocus)tab.focus();
}
tabs.forEach((tab,index)=>{
  tab.addEventListener("click",()=>activateTab(tab));
  tab.addEventListener("keydown",event=>{
    let next=index;
    if(event.key==="ArrowRight")next=(index+1)%tabs.length;
    else if(event.key==="ArrowLeft")next=(index-1+tabs.length)%tabs.length;
    else if(event.key==="Home")next=0;
    else if(event.key==="End")next=tabs.length-1;
    else return;
    event.preventDefault();
    activateTab(tabs[next],true);
  });
});

const symbols=["🐳","🦋","🌈","🚀","🐢","⭐"];
const memoryGrid=document.querySelector("#memory-grid");
let first=null,lock=false,matches=0,turns=0;
function shuffle(items){const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
function startMemory(){memoryGrid.innerHTML="";first=null;lock=false;matches=0;turns=0;document.querySelector("#memory-score").textContent="الأزواج: ٠ / ٦";document.querySelector("#memory-feedback").textContent="ابدأ بالضغط على أي بطاقتين.";shuffle([...symbols,...symbols]).forEach((symbol,index)=>{const button=document.createElement("button");button.type="button";button.className="memory-card";button.textContent="؟";button.setAttribute("aria-label","بطاقة مخفية رقم "+(index+1));button.dataset.symbol=symbol;button.addEventListener("click",()=>flipCard(button));memoryGrid.append(button);});}
function flipCard(card){if(lock||card.disabled||card===first)return;card.textContent=card.dataset.symbol;card.classList.add("flipped");card.setAttribute("aria-label","بطاقة "+card.dataset.symbol);if(!first){first=card;return;}turns++;if(first.dataset.symbol===card.dataset.symbol){first.classList.add("matched");card.classList.add("matched");first.disabled=true;card.disabled=true;first=null;matches++;document.querySelector("#memory-score").textContent="الأزواج: "+matches+" / ٦";if(matches===6)document.querySelector("#memory-feedback").textContent="أحسنت! وجدت كل الأزواج في "+turns+" محاولة.";else document.querySelector("#memory-feedback").textContent="رائع! وجدت زوجًا متشابهًا.";return;}lock=true;const previous=first;first=null;document.querySelector("#memory-feedback").textContent="حاول مرة أخرى، وتذكّر مكان الصور.";window.setTimeout(()=>{[previous,card].forEach(item=>{item.textContent="؟";item.classList.remove("flipped");item.setAttribute("aria-label","بطاقة مخفية");});lock=false;},750);}
document.querySelector("#memory-restart").addEventListener("click",startMemory);
startMemory();

const colors=[{name:"الأحمر",hex:"#e84d4d"},{name:"الأزرق",hex:"#3187dc"},{name:"الأخضر",hex:"#27a66b"},{name:"الأصفر",hex:"#f2c744"},{name:"البنفسجي",hex:"#9362c9"}];
let colorPoints=0,colorTarget=null;
function nextColor(){colorTarget=colors[Math.floor(Math.random()*colors.length)];document.querySelector("#color-question").textContent="اضغط على اللون "+colorTarget.name;document.querySelector("#color-feedback").textContent="";const choices=shuffle(colors).slice(0,4);if(!choices.includes(colorTarget))choices[Math.floor(Math.random()*choices.length)]=colorTarget;const holder=document.querySelector("#color-options");holder.innerHTML="";shuffle(choices).forEach(color=>{const button=document.createElement("button");button.type="button";button.className="color-choice";button.style.backgroundColor=color.hex;button.setAttribute("aria-label",color.name);button.addEventListener("click",()=>{if(color===colorTarget){colorPoints++;document.querySelector("#color-feedback").textContent="إجابة صحيحة! أحسنت."; }else{document.querySelector("#color-feedback").textContent="محاولة جميلة! اللون المطلوب هو "+colorTarget.name+"."; }document.querySelector("#color-score").textContent="النقاط: "+colorPoints;holder.querySelectorAll("button").forEach(b=>b.disabled=true);});holder.append(button);});}
document.querySelector("#color-next").addEventListener("click",nextColor);

let numberPoints=0,numberAnswer=8;
function nextNumber(){const start=Math.floor(Math.random()*4)+1;const step=Math.floor(Math.random()*3)+2;const values=[start,start+step,start+step*2];numberAnswer=start+step*3;document.querySelector("#number-question").textContent=values.join("، ")+"، ؟";const opts=shuffle([numberAnswer,numberAnswer+1,Math.max(0,numberAnswer-1)]);const holder=document.querySelector("#number-options");holder.innerHTML="";opts.forEach(value=>{const button=document.createElement("button");button.type="button";button.textContent=new Intl.NumberFormat("ar-EG").format(value);button.addEventListener("click",()=>{if(value===numberAnswer){numberPoints++;document.querySelector("#number-feedback").textContent="صحيح! أنت بارع في اكتشاف الأنماط."; }else{document.querySelector("#number-feedback").textContent="الإجابة الصحيحة هي "+new Intl.NumberFormat("ar-EG").format(numberAnswer)+"."; }document.querySelector("#number-score").textContent="النقاط: "+numberPoints;holder.querySelectorAll("button").forEach(b=>b.disabled=true);});holder.append(button);});document.querySelector("#number-feedback").textContent="اختر الرقم الذي يكمل النمط.";}
document.querySelector("#number-next").addEventListener("click",nextNumber);
nextNumber();


// Letter hunt: local-only play, no account or child data collection.
const arabicLetters=[..."ابتثجحخدذرزسشصضطظعغفقكلمنهوي"];
let lettersPoints=0,lettersAnswer="";
function nextLetters(){
  const pool=shuffle([...arabicLetters]).slice(0,6);
  lettersAnswer=pool[Math.floor(Math.random()*pool.length)];
  document.querySelector("#letters-question").textContent="اعثر على حرف: "+lettersAnswer;
  document.querySelector("#letters-feedback").textContent="اضغط على الحرف المطابق.";
  document.querySelector("#letters-score").textContent="النقاط: "+new Intl.NumberFormat("ar-EG").format(lettersPoints);
  const holder=document.querySelector("#letters-options");holder.innerHTML="";
  shuffle(pool).forEach(letter=>{
    const button=document.createElement("button");button.type="button";button.textContent=letter;
    button.setAttribute("aria-label","الحرف "+letter);
    button.addEventListener("click",()=>{
      if(letter===lettersAnswer){lettersPoints++;document.querySelector("#letters-feedback").textContent="أحسنت! هذا هو الحرف الصحيح.";}
      else{document.querySelector("#letters-feedback").textContent="محاولة رائعة! الحرف المطلوب هو "+lettersAnswer+".";}
      document.querySelector("#letters-score").textContent="النقاط: "+new Intl.NumberFormat("ar-EG").format(lettersPoints);
      holder.querySelectorAll("button").forEach(b=>b.disabled=true);
    });holder.append(button);
  });
}
document.querySelector("#letters-next").addEventListener("click",nextLetters);nextLetters();

// Shape challenge: recognize common geometric shapes.
const shapes=[{name:"الدائرة",symbol:"●"},{name:"المربع",symbol:"■"},{name:"المثلث",symbol:"▲"},{name:"المعين",symbol:"◆"},{name:"النجمة",symbol:"★"}];
let shapesPoints=0,shapesAnswer=null;
function nextShapes(){
  shapesAnswer=shapes[Math.floor(Math.random()*shapes.length)];
  document.querySelector("#shapes-question").textContent="اختر شكل: "+shapesAnswer.name;
  document.querySelector("#shapes-feedback").textContent="فكّر جيدًا ثم اختر.";
  document.querySelector("#shapes-score").textContent="النقاط: "+new Intl.NumberFormat("ar-EG").format(shapesPoints);
  const holder=document.querySelector("#shapes-options");holder.innerHTML="";
  shuffle(shapes).forEach(shape=>{
    const button=document.createElement("button");button.type="button";
    button.textContent=shape.symbol;button.setAttribute("aria-label",shape.name);
    button.style.fontSize="32px";
    button.addEventListener("click",()=>{
      if(shape===shapesAnswer){shapesPoints++;document.querySelector("#shapes-feedback").textContent="ممتاز! تعرفت على الشكل الصحيح.";}
      else{document.querySelector("#shapes-feedback").textContent="حاول مرة أخرى في الجولة القادمة. الشكل هو "+shapesAnswer.name+".";}
      document.querySelector("#shapes-score").textContent="النقاط: "+new Intl.NumberFormat("ar-EG").format(shapesPoints);
      holder.querySelectorAll("button").forEach(b=>b.disabled=true);
    });holder.append(button);
  });
}
document.querySelector("#shapes-next").addEventListener("click",nextShapes);nextShapes();
