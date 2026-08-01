const map = document.getElementById("map");

let oldX;
let oldY;
let currentX = 0;
let currentY = 0;
let targetX = 0;
let targetY = 0;
let panning = false;
let requestAnimation = true;

let originalWidth = 631.2168;
let originalHeight = 612.18842;

let currentZoom = 1;
let targetZoom = 1;

let evC = 0;
let evD = 0;

const evTotals = {
    solidC:0,
    likelyC:0,
    leanC:0,
    tiltC:0,

    solidD:0,
    likelyD:0,
    leanD:0,
    tiltD:0,

    tossup:538
};

let evTossup = 538;

map.addEventListener("wheel",(event)=>{
    event.preventDefault();

    event.preventDefault();

    const rect = map.getBoundingClientRect();

    // mouse position in SVG element pixels
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;


    // current visible map size
    const currentWidth = currentZoom * originalWidth;
    const currentHeight = currentZoom * originalHeight;


    // convert mouse position into map coordinates
    const mapMouseX = currentX + (mouseX / rect.width) * currentWidth;
    const mapMouseY = currentY + (mouseY / rect.height) * currentHeight;

    const minZoom = 0.05;
    const maxZoom = 1.5;

    // zoom
    if(event.deltaY < 0){
        targetZoom *= 0.8;
    } else if (event.deltaY > 0){
        targetZoom *= 1.2;
    }

    // limit zoom range
    targetZoom = Math.max(minZoom, Math.min(maxZoom, targetZoom));


    // new view size after zoom
    const targetWidth = targetZoom * originalWidth;
    const targetHeight = targetZoom * originalHeight;


    // keep the same map point under the cursor
    targetX = mapMouseX - (mouseX / rect.width) * targetWidth;
    targetY = mapMouseY - (mouseY / rect.height) * targetHeight;
});

map.addEventListener("pointerdown",(event)=>{
    event.stopPropagation()
    panning = true;

    oldX = event.clientX;
    oldY = event.clientY;
});

map.addEventListener("pointermove",(event)=>{
    event.stopPropagation()
    
    if(!panning){
        return;
    }

    let changeX = (event.clientX - oldX) / (0.5 / currentZoom);
    let changeY = (event.clientY - oldY) / (0.5 / currentZoom);
    oldX = event.clientX;
    oldY = event.clientY;
    targetX -= changeX;
    targetY -= changeY;
});

map.addEventListener("pointerup",(event)=>{
    event.stopPropagation()
    
    panning = false;
});

document.addEventListener("pointerup", ()=>{
    event.stopPropagation()
    
    panning = false;
});

animate();



const states = document.querySelectorAll(".state");
let selectedParty = "none";

states.forEach(state => {
    state.addEventListener("click", () => {
        let name = event.currentTarget.id;
        let currentStatus = statesData[name].party;

        let activeCycle;

        if(selectedParty == "conservative"){
            activeCycle = cycleC;
        } else if (selectedParty == "democrat"){
            activeCycle = cycleD;
        } else {
            activeCycle = cycleTossup;
        }

        let currentIndex = activeCycle.indexOf(currentStatus);

        currentIndex++;

        if(currentIndex >= activeCycle.length){
            currentIndex = 0;
        }

        currentStatus = activeCycle[currentIndex];
        statesData[name].party = currentStatus;

        state.style.fill = colorMap[currentStatus];

        calculateVotes();
    });
});

states.forEach(state => {
    state.addEventListener("contextmenu", (e) => {
        e.preventDefault();

        let name = event.currentTarget.id;
        let currentStatus = statesData[name].party;

        let activeCycle;

        if(selectedParty == "conservative"){
            activeCycle = cycleC;
        } else if (selectedParty == "democrat"){
            activeCycle = cycleD;
        } else {
            activeCycle = cycleTossup;
        }

        let currentIndex = activeCycle.indexOf(currentStatus);

        currentIndex--;

        if(currentIndex < 0){
            currentIndex = activeCycle.length - 1;
        }

        currentStatus = activeCycle[currentIndex];
        statesData[name].party = currentStatus;

        state.style.fill = colorMap[currentStatus];

        calculateVotes();
    });
});

const cycleC = [
    "solid-C",
    "likely-C",
    "lean-C",
    "tilt-C",
];

const cycleD = [
    "solid-D",
    "likely-D",
    "lean-D",
    "tilt-D",
];

const cycleTossup = ["none"];

const colorMap = {
    "solid-C":"#bf1d29",
    "likely-C":"#ff5865",
    "lean-C":"#ff8b98",
    "tilt-C":"#cf8980",
    "tilt-D":"#949bb3",
    "lean-D":"#8aafff",
    "likely-D":"#577ccc",
    "solid-D":"#1c408c",
    "none":"rgb(160, 160, 160)"
};



function animate(){
    currentZoom += (targetZoom - currentZoom) * 0.1;
    currentX += (targetX - currentX) * 0.1;
    currentY += (targetY - currentY) * 0.1;

    map.setAttribute(
        "viewBox",
        `${currentX} ${currentY} ${currentZoom * originalWidth} ${currentZoom * originalHeight}`
    );

    if(requestAnimation){
        requestAnimationFrame(animate);
    }

    requestAnimation = true;
}

function recenter(){
    targetZoom = 1;
    targetX = 0;
    targetY = 0;

    map.setAttribute(
        "viewBox",
        `${currentX} ${currentY} ${currentZoom * 631.2168} ${currentZoom * 612.18842}`
    );

    animate();
    requestAnimation = false;
}


function toParty(party){
    selectedParty = party;

    document.querySelectorAll(".partySelect").forEach(button => {
        button.style.border = "0px solid white";
        button.style.scale = "1";
    });

    document.querySelector("#" + party).style.border = "2px solid white";
    document.querySelector("#" + party).style.scale = "1.05";
};

function resetMap(){
    document.querySelectorAll(".state").forEach(state => {
        statesData[state.id].party = "none";
        state.style.fill = colorMap["none"];

        calculateVotes();
    })
}

function calculateVotes(){
    evC = 0;
    evD = 0;
    const parties = ["solid-C","likely-C","lean-C","tilt-C","tilt-D","lean-D","likely-D","solid-D","tossup"];
    const partyKeys = ["solidC","likelyC","leanC","tiltC","tiltD","leanD","likelyD","solidD","tossup"];

    for(let i = 0; i < parties.length; i++){
        evTotals[partyKeys[i]] = 0;
    }

    for(let state in statesData){
        let party = statesData[state].party;
        let votes = statesData[state].ev;

        if(party == "solid-C" || party == "likely-C" || party == "lean-C" || party == "tilt-C"){
            evC += votes;
        } else if (party == "solid-D" || party == "likely-D" || party == "lean-D" || party == "tilt-D"){
            evD += votes;
        }

        for(let i = 0; i < parties.length; i++){
            if(party == parties[i]){
                evTotals[partyKeys[i]] += votes;
            }
        }

        if(party == "none"){
            evTotals.tossup += votes;
        }

        evTossup = 538 - evC - evD;

        document.querySelector("#conservative").innerHTML = "Conservative - " + evC;
        document.querySelector("#democrat").innerHTML = "Democrat - " + evD;
        document.querySelector("#tossupSelect").innerHTML = "Tossup - " + evTossup;

        for(let key in partyKeys){
            let section = document.querySelector("#" + partyKeys[key]);            
            let votes = evTotals[partyKeys[key]];
            let width = (votes / 538) * 100;

            if(votes == 0){
                section.textContent = "";
            } else {
                section.textContent = evTotals[partyKeys[key]];
            }

            section.style.width = width + "%";
        }

        if(evC >= 270){
            document.querySelector("#winMarker").style.color = "#bf1d29";
        } else if (evD >= 270){
            document.querySelector("#winMarker").style.color = "#1c408c";
        } else {
            document.querySelector("#winMarker").style.color = "rgb(160, 160, 160)";
        }
    }
}

function takeScreenshot(){
    html2canvas(
        document.querySelector("#mapcontainer")
    ).then((canvas) => {
        let link = document.createElement("a");

        link.download = "map.png";
        link.href = canvas.toDataURL();

        link.click();
    });
}



calculateVotes();