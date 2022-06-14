//jshint esversion:6
module.exports = projGen;

//normal dist
const gaussian = require('gaussian');
// const distribution = gaussian(mean, variance);
// Take a random sample using inverse transform sampling method.
// var sample = distribution.ppf(Math.random());

// Global parameters
const n = 10;
const dMin = 1;
const dMax = 10;
const rMax = 3;
const prShortNames = ["SPT", "LPT", "MIS", "MTS", "EST", "EFT", "LST", "LFT", "MF"];
const prFullNames = [
  "Shortest Processing Time First",
  "Longest Processing Time First",
  "Most Immediate Successors First",
  "Most Total Successors First",
  "Minimum Earliest Start Time First",
  "Minimum Earliest Finish Time First",
  "Minimum Latest Start Time First",
  "Minimum Latest Finish Time First",
  "Minimum Float First"
];
const prCount = prShortNames.length;
const pertDevMin = 30;
const pertDevMax = 90;

function roundToTwo(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100
  // return +(Math.round(num + "e+2")  + "e-2");
  // return Math.round(num * 100) / 100
}

function networkGen(proj, startBool, endBool){
  // function parameters
  const pProb = 0.30;
  const pMax = n*(n-1)/2; // max theoretical number of transitive arcs
  const osMin = 0.45;
  const osMax = 0.65;
  const terminalMin = 2; // minimum number of terminal (start/end) nodes
  const terminalMax = 3; // maximum number of terminal (start/end) nodes

  // Helping Vars
  var pRand;
  var pTransBool; // true if transitive predecessor
  var pCount; // counter of transitive arcs
  var pOs; // the order strength of a generated project
  var networkValidBool; // true if a generated project is feasible & acceptable
  var startCount; // counter of starting nodes
  var endCount; // counter of ending nodes
  var xCounter; // helping counter

  // generate the project
  do {
    // initializations
    for (var i = 0; i < n; i++) {
      proj.pStr[i] = '';
      startBool[i] = false;
      endBool[i] = false;
      for (var j = 0; j < n; j++) {
        proj.P[i][j] = 0;
        proj.A[i][j] = 0;
      }
    }
    pCount = 0; // OS counter
    startCount = 0; // starting nodes counter
    endCount = 0; // ending nodes counter
    networkValidBool = true; // project feasible and acceptable

    // random transitive network
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < n; j++) {
        if (i < j) { // topological order
          pRand = Math.random();
          if (pRand < pProb) { // random precedences
            proj.P[i][j] = 1;
            pCount++; // increase OS counter
            for (var k = 0; k < i; k++) { // transitive updates
              if (proj.P[k][i] === 1 && proj.P[k][j] === 0) {
                proj.P[k][j] = 1; // add to transitive predecessors
                pCount++; // increase OS counter
              }
            }
          }
        }
      }
    }

    // immediate arcs
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < n; j++) {
        if (i < j && proj.P[i][j] === 1) { // topological order
          pTransBool = false;
          for (var k = i+1; k < j; k++) { // transitive predecessor?
            if (proj.P[i][k] === 1 && proj.P[k][j] === 1) {
              pTransBool = true;
              break;
            }
          }
          if (!pTransBool) { // if not transitive, then immediate
            proj.A[i][j] = 1; // immediate predecessor
            if (proj.pStr[j].length > 0) {
              proj.pStr[j] = proj.pStr[j] + ", " + proj.N[i];
            } else {
              proj.pStr[j] = proj.pStr[j] + proj.N[i];
            }
          }
        }
      }
    }

    // network feasible?
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < n; j++) {
        if (proj.P[i][j] === 1 && proj.P[j][i] === 1) {
          networkValidBool = false;
          console.log("CPM Network Infeasible: Cycles detected! (i-->j-->i):", i, j);
          res.end();
        } else if (proj.P[i][j] === 1 && i >= j) {
          networkValidBool = false;
          console.log("CPM Network Infeasible: The topological order is wrong (i-->j && i>j):", i, j);
          res.end();
        }
        for (var k = i + 1; k < j; k++) {
          if (proj.P[i][k] === 1 && proj.P[k][j] === 1 && proj.P[i][j] !== 1) {
            networkValidBool = false;
            console.log("CPM Network Infeasible: Transitive arc missing (i,k,j): (i-->k && k-->j && i!->j):", i, k, j);
            res.end();
          }
        }
      }
    }

    // OS in range?
    pOs = pCount/pMax;
    if (pOs < osMin || pOs > osMax) {
      networkValidBool = false;
      // console.log("OS not acceptable");
    }

    // multiple ending nodes?
    if (networkValidBool) {
      for (var i = 0; i < n; i++) {
        xCounter = proj.P[i].reduce((partialSum, a) => partialSum + a, 0); // sum of elements in P[i]
        if (xCounter === 0) { // no successors
          endCount++;
          endBool[i] = true;
        }
      }
      if (endCount < terminalMin || endCount > terminalMax) {
        networkValidBool = false;
        // console.log("number of ending nodes not acceptable");
      }
    }

    // multiple starting nodes?
    if (networkValidBool) {
      for (var i = 0; i < n; i++) {
        xCounter = 0;
        for (var j = 0; j < i; j++) {
          if (proj.P[j][i] === 1) {
            xCounter++;
            break;
          }
        }
        if (xCounter === 0) { // no predecessors
          startCount++;
          startBool[i] = true;
        }
      }
      if (startCount < terminalMin || startCount > terminalMax) {
        networkValidBool = false;
        // console.log("number of starting nodes not acceptable");
      }
    }

  } while (!networkValidBool);
}

function cpm(proj){
  /////////////////// CPM calculations
  // forwarf pass
  proj.makespan = 0;
  for (var i = 0; i < n; i++) {
    proj.es[i] = 0;
    for (var j = 0; j < i; j++) {
      if (proj.A[j][i] === 1) {
        proj.es[i] = Math.max(proj.es[i], proj.es[j] + proj.D[j]);
      }
    }
    proj.makespan = Math.max(proj.makespan, proj.es[i] + proj.D[i]);
  }
  //backward pass
  for (var i = n - 1; i >= 0; i--) {
    proj.lf[i] = proj.makespan;
    for (var j = i + 1; j < n; j++) {
      if (proj.A[i][j] === 1) {
        proj.lf[i] = Math.min(proj.lf[i], proj.lf[j] - proj.D[j]);
      }
    }
  }
  // Floats
  for (var i = 0; i < n; i++) {
    if (proj.lf[i] - proj.D[i] - proj.es[i] == 0) {
      proj.caBool[i] = true;
    } else {
      proj.caBool[i] = false;
    }
  }
}

function nextCriticalPath(proj, job, currentPath){
  const sucNr = proj.A[job].reduce((partialSum, a) => partialSum + a, 0); // sum of elements in P[job]

  if (sucNr === 0) { //Job is ending node (currentPath is a new critical path)
    var cumDur = 0;
    for (var i = 0; i < currentPath.length; i++) { // cumulative duration of currentPath
      cumDur = cumDur + proj.D[currentPath[i]];
    }
    if (cumDur === proj.makespan) { // if currentPath is one of the longest paths of the network
      proj.cpNr++;
      let newPath = currentPath.slice();
      proj.cps.push(newPath);
    }
    currentPath.pop();
    return;
  } else {
    for (var i = job + 1; i < proj.n; i++) {
      if (proj.A[job][i] === 1) { // is a successor of Job
        if (proj.caBool[i]) { // i is a critical acctivity
          currentPath.push(i);
          nextCriticalPath(proj, i, currentPath);
        }
      }
    }
    currentPath.pop();
    return;
  }
}

function allCriticalPaths(proj, startBool){
  //////////////////////// find critical paths
  for (var i = 0; i < n; i++) {
    if (startBool[i] && proj.caBool[i]) { // starting node & critical
      nextCriticalPath(proj, i, [i]);
    }
  }
  for (var i = 0; i < proj.cpNr; i++) { // creating cp names
    let cpName = '';
    cpName = cpName + proj.N[proj.cps[i][0]];
    for (var j = 1; j < proj.cps[i].length; j++) {
      cpName = cpName + '-' + proj.N[proj.cps[i][j]];
    }
    proj.cpStr.push(cpName);
  }
}

function prMinDur(proj, eligBool){
  var selectedJob = n;
  var minDur = dMax + 1;
  for (var i = 0; i < n; i++) {
    if (eligBool[i] && proj.D[i] < minDur) {
      selectedJob = i;
      minDur = proj.D[i];
    }
  }
  return selectedJob;
}

function prMaxDur(proj, eligBool){
  var selectedJob = n;
  var maxDur = dMin - 1;
  for (var i = 0; i < n; i++) {
    if (eligBool[i] && proj.D[i] > maxDur) {
      selectedJob = i;
      maxDur = proj.D[i];
    }
  }
  return selectedJob;
}

function prMaxIS(proj, eligBool){
  var selectedJob = n;
  var maxIS = -1;
  var isNr = 0;
  for (var i = 0; i < n; i++) {
    if (eligBool[i]) {
      isNr = proj.A[i].reduce((partialSum, a) => partialSum + a, 0);
      if (isNr > maxIS) {
        selectedJob = i;
        maxIS = isNr;
      }
    }
  }
  return selectedJob;
}

function prMaxTS(proj, eligBool){
  var selectedJob = n;
  var maxTS = -1;
  var tsNr = 0;
  for (var i = 0; i < n; i++) {
    if (eligBool[i]) {
      tsNr = proj.P[i].reduce((partialSum, a) => partialSum + a, 0);
      if (tsNr > maxTS) {
        selectedJob = i;
        maxTS = tsNr;
      }
    }
  }
  return selectedJob;
}

function prMinEst(proj, eligBool){
  var selectedJob = n;
  var minEst = proj.makespan + 1;
  for (var i = 0; i < n; i++) {
    if (eligBool[i] && proj.es[i] < minEst) {
      selectedJob = i;
      minEst = proj.es[i];
    }
  }
  return selectedJob;
}

function prMinEft(proj, eligBool){
  var selectedJob = n;
  var minEft = proj.makespan + 1;
  for (var i = 0; i < n; i++) {
    if (eligBool[i] && (proj.es[i] + proj.D[i] < minEft)) {
      selectedJob = i;
      minEft = proj.es[i] + proj.D[i];
    }
  }
  return selectedJob;
}

function prMinLst(proj, eligBool){
  var selectedJob = n;
  var minLst = proj.makespan + 1;
  for (var i = 0; i < n; i++) {
    if (eligBool[i] && (proj.lf[i] - proj.D[i] < minLst)) {
      selectedJob = i;
      minLst = proj.lf[i] - proj.D[i];
    }
  }
  return selectedJob;
}

function prMinLft(proj, eligBool){
  var selectedJob = n;
  var minLft = proj.makespan + 1;
  for (var i = 0; i < n; i++) {
    if (eligBool[i] && (proj.lf[i] < minLft)) {
      selectedJob = i;
      minLft = proj.lf[i];
    }
  }
  return selectedJob;
}

function prMinFloat(proj, eligBool){
  var selectedJob = n;
  var minFloat = proj.makespan + 1;
  for (var i = 0; i < n; i++) {
    if (eligBool[i] && (proj.lf[i] - proj.D[i] - proj.es[i] < minFloat)) {
      selectedJob = i;
      minFloat = proj.lf[i] - proj.D[i] - proj.es[i];
    }
  }
  return selectedJob;
}

function priorityList(proj, startBool, priorityRuleNr){
  //////////////////////// Prioritize activities
  var addedCounter = 0;
  var selectedJob = 0;
  var eligBool = new Array(n); // true if eligible activity
  var addedBool = new Array(n); // true is activity added to the list
  for (var i = 0; i < n; i++) {
    addedBool[i] = false;
    if (startBool[i]) {
      eligBool[i] = true;
    } else {
      eligBool[i] = false;
    }
  }
  while (addedCounter < n) {
    if (priorityRuleNr === 0) {
      selectedJob = prMinDur(proj, eligBool);
    } else if (priorityRuleNr === 1){
      selectedJob = prMaxDur(proj, eligBool);
    } else if (priorityRuleNr === 2){
      selectedJob = prMaxIS(proj, eligBool);
    } else if (priorityRuleNr === 3){
      selectedJob = prMaxTS(proj, eligBool);
    } else if (priorityRuleNr === 4){
      selectedJob = prMinEst(proj, eligBool);
    } else if (priorityRuleNr === 5){
      selectedJob = prMinEft(proj, eligBool);
    } else if (priorityRuleNr === 6){
      selectedJob = prMinLst(proj, eligBool);
    } else if (priorityRuleNr === 7){
      selectedJob = prMinLft(proj, eligBool);
    } else if (priorityRuleNr === 8){
      selectedJob = prMinFloat(proj, eligBool);
    }
    proj.priority[priorityRuleNr][addedCounter] = selectedJob;
    addedCounter++;
    addedBool[selectedJob] = true;
    eligBool[selectedJob] = false;
    for (var i = selectedJob + 1; i < n; i++) {
      if ((proj.A[selectedJob][i] === 1)) {
        eligBool[i] = true;
        for (var j = 0; j < i; j++) {
          if ((proj.A[j][i] === 1) && !addedBool[j]) {
            eligBool[i] = false;
          }
        }
      }
    }
  }
}

function sgs(proj, priorityRuleNr){
  // Serial Schedule
  const timeHorizon = n * dMax;
  var currentJob;
  var maxPredFt;
  var rFeasible;
  var rFree = new Array(proj.rNr);
  for (var i = 0; i < proj.rNr; i++) {
    rFree[i] = new Array(timeHorizon);
  }
  proj.sgsMakespan[priorityRuleNr] = 0;
  for (var r = 0; r < proj.rNr; r++) {
    for (var t = 0; t < timeHorizon; t++) {
      rFree[r][t] = true;
    }
  }
  for (var i = 0; i < n; i++) {
    currentJob = proj.priority[priorityRuleNr][i];
    proj.sgsSt[priorityRuleNr][currentJob] = 0;
    maxPredFt = 0;
    for (var j = 0; j < currentJob; j++) {
      if (proj.A[j][currentJob] === 1) {
        maxPredFt = Math.max(maxPredFt, proj.sgsSt[priorityRuleNr][j] + proj.D[j]);
      }
    }
    for (var t = maxPredFt; t < timeHorizon; t++) {
      if (rFree[proj.R[currentJob]][t]) {
        rFeasible = true;
        for (var u = t + 1; u < t + proj.D[currentJob] ; u++) {
          if (!rFree[proj.R[currentJob]][u]) {
            rFeasible = false;
            break;
          }
        }
        if (rFeasible) {
          proj.sgsSt[priorityRuleNr][currentJob] = t;
          proj.sgsMakespan[priorityRuleNr] = Math.max(proj.sgsMakespan[priorityRuleNr], t + proj.D[currentJob]);
          for (var u = t; u < t + proj.D[currentJob] ; u++) {
            rFree[proj.R[currentJob]][u] = false;
          }
          break;
        }
      }
    }
  }
}

function pgs(proj, priorityRuleNr){
  const timeHorizon = n * dMax;
  var currentJob = 0;
  var addedCounter = 0;
  var predFeasible = true;
  var rFeasible = true;
  var rFree = new Array(proj.rNr);
  for (var i = 0; i < proj.rNr; i++) {
    rFree[i] = new Array(timeHorizon);
  }
  var addedBool = new Array(n); // true is activity added to the list
  for (var i = 0; i < n; i++) {
    addedBool[i] = false;
    proj.pgsSt[priorityRuleNr][i] = 0;
  }
  for (var r = 0; r < proj.rNr; r++) {
    for (var t = 0; t < timeHorizon; t++) {
      rFree[r][t] = true;
    }
  }
  proj.pgsMakespan[priorityRuleNr] = 0;
  for (var t = 0; t < timeHorizon; t++) {
    for (var i = 0; i < n; i++) {
      currentJob = proj.priority[priorityRuleNr][i];
      if (!addedBool[currentJob]) {
        predFeasible = true;
        for (var j = 0; j < currentJob; j++) {
          if (proj.A[j][currentJob] === 1){
            if (!addedBool[j] || (proj.pgsSt[priorityRuleNr][j] + proj.D[j] > t)) {
              predFeasible = false;
              break;
            }
          }
        }
        if (predFeasible) {
          rFeasible = true;
          for (var u = t; u < t + proj.D[currentJob]; u++) {
            if (!rFree[proj.R[currentJob]][u]) {
              rFeasible = false;
              break;
            }
          }
          if (rFeasible) {
            proj.pgsSt[priorityRuleNr][currentJob] = t;
            addedBool[currentJob] = true;
            addedCounter++;
            for (var u = t; u < t + proj.D[currentJob]; u++) {
              rFree[proj.R[currentJob]][u] = false;
            }
            proj.pgsMakespan[priorityRuleNr] = Math.max(proj.pgsMakespan[priorityRuleNr], t + proj.D[currentJob]);
          }
        }
      }
      if (addedCounter === n) {
        break;
      }
    }
    if (addedCounter === n) {
      break;
    }
  }
}

function gojsArrays(proj, startBool, endBool){
  ///// gojs nodes and links arrays
  const startNode = { key: 0, text: "Start", length: 0, earlyStart: 0, lateFinish: 0, critical: true };
  proj.goNodes.push(startNode); // dummy start node
  const endNode = { key: n+1, text: "End", length: 0, earlyStart: proj.makespan, lateFinish: proj.makespan, critical: true };
  proj.goNodes.push(endNode); // dummy end node
  for (var i = 0; i < n; i++) { // real nodes
    const newNode = { key: i+1, text: proj.N[i], length: proj.D[i], earlyStart: proj.es[i], lateFinish: proj.lf[i], critical: proj.caBool[i] };
    proj.goNodes.push(newNode);
  }
  for (var i = 0; i < n; i++) {
    if (startBool[i]) {
      const startLink = { from: 0, to: i+1 };
      proj.goLinks.push(startLink);
    }
    for (var j = i+1; j < n; j++) {
      if (proj.A[i][j] === 1) {
        const newLink = { from: i+1, to: j+1 };
        proj.goLinks.push(newLink);
      }
    }
    if (endBool[i]) {
      const endLink = { from: i+1, to: n+1 };
      proj.goLinks.push(endLink);
    }
  }
}

function pert(proj){
  //random dev percent
  proj.pertDev = Math.floor(Math.random() * (pertDevMax-pertDevMin)) + pertDevMin;

  // calc variance
  var minVal = 0;
  var maxVal = 0;
  var jobVar = 0;
  proj.pertVar = 0;
  proj.cps[0].forEach((i)=>{
    maxVal = roundToTwo((1+(proj.pertDev / 100)) * proj.D[i]);
    minVal = roundToTwo((1-(proj.pertDev / 100)) * proj.D[i]);
    jobVar = roundToTwo(Math.pow((maxVal - minVal)/6 , 2));
    // console.log("job: ", proj.N[i], " min:", minVal, "  max:", maxVal, "  jVar:", jobVar);
    proj.pertVar += jobVar;
   });
   proj.pertVar = roundToTwo(proj.pertVar);
   // console.log("tVar:", proj.pertVar);
   // console.log("-------------");

  //random px
  proj.pertPx = Math.floor(Math.random() * (95-75)) + 75;
  const distribution = gaussian(proj.makespan, proj.pertVar);
  proj.pertPxSol = roundToTwo(distribution.ppf(proj.pertPx / 100));

  //Cumulative probability of a given project duration
  proj.pertDur = roundToTwo(distribution.ppf((Math.floor(Math.random() * (74-55)) + 55)/100));
  proj.pertDurSol = roundToTwo(distribution.cdf(proj.pertDur));

  //Log the result
  // console.log("percent: ", proj.pertDev/100);
  // console.log("mean: ", proj.makespan);
  // console.log("variance: ", proj.pertVar);
  // console.log("Px: ", proj.pertPx/100);
  // console.log("PxDur: ", proj.pertPxSol);
  // console.log("Dur: ", proj.pertDur);
  // console.log("DurProb: ", proj.pertDurSol);
  // console.log("--------------");
}

function projGen(){

  // create the project object
  var proj = {
    n: n,
    N: new Array(n),
    D: new Array(n),
    A: new Array(n),
    P: new Array(n),
    pStr:new Array(n),
    R: new Array(n),
    rNr: rMax,
    makespan: 0,
    es: new Array(n),
    lf: new Array(n),
    caBool: new Array(n),
    cpNr: 0,
    cps:[],
    cpStr:[],
    prNr: 0,
    priority: new Array(prCount),
    sgsSt: new Array(prCount),
    sgsMakespan: new Array(prCount),
    pgsSt: new Array(prCount),
    pgsMakespan: new Array(prCount),
    goNodes:[],
    goLinks: [],
    pertDev: 0,
    pertVar: 0,
    pertPx: 0,
    pertPxSol: 0,
    pertDur: 0,
    pertDurSol: 0
  };
  for (var i = 0; i < n; i++) {
    proj.A[i] = new Array(n);
    proj.P[i] = new Array(n);
  }
  for (var i = 0; i < prCount; i++) {
    proj.priority[i] = new Array(n);
    proj.sgsSt[i] = new Array(n);
    proj.pgsSt[i] = new Array(n);
    proj.sgsMakespan[i] = 0;
    proj.pgsMakespan[i] = 0;
  }

  // Activity names
  const alpha = Array.from(Array(n)).map((e, i) => i + 65);
  proj.N = alpha.map((x) => String.fromCharCode(x));

  // Helping Vars & Arrays
  var startBool = new Array(n); // true if starting node
  var endBool = new Array(n); // true if ending node
  var difSgsPgs = false;
  var difPr = [];

  do {

    // random durations
    for (var i = 0; i < n; i++) {
      proj.D[i] = Math.floor((Math.random() * dMax) + dMin);
    }

    networkGen(proj, startBool, endBool);

    // random resources
    for (var i = 0; i < n; i++) {
      proj.R[i] = proj.rNr;
      if(startBool[i]){
        proj.R[i] = 0;
      } else if (endBool[i]) {
        proj.R[i] = 2;
      } else {
        proj.R[i] = 1;
      }
      if (proj.R[i] === proj.rNr) {
        console.log("Resource allocation error!");
      }
    }

    cpm(proj);

    difSgsPgs = false;
    for (var i = 0; i < 9; i++) {

      priorityList(proj, startBool, i);
      sgs(proj, i);
      pgs(proj, i);

      if (proj.sgsMakespan[i] !== proj.pgsMakespan[i]) {
        difSgsPgs = true;
        difPr.push(i);
      }
    }
    if (difSgsPgs) {
      const rnd = Math.floor(Math.random()*difPr.length);
      proj.prNr = difPr[rnd];
    }

  } while (!difSgsPgs);

  allCriticalPaths(proj, startBool);

  gojsArrays(proj, startBool, endBool);

  pert(proj);

  return proj;
}
