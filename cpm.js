//jshint esversion:6
module.exports = cpmGenerate;

function criticalPathFinder(proj, job, currentPath){
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
          criticalPathFinder(proj, i, currentPath);
        }
      }
    }
    currentPath.pop();
    return;
  }
}

function cpmGenerate(){
  // general parameters
  const n = 10;
  const dMin = 1;
  const dMax = 10;
  const timeHorizon = n * dMax;
  const maxR = 3;
  const pProb = 0.30;
  const pMax = n*(n-1)/2; // max theoretical number of transitive arcs
  const osMin = 0.45;
  const osMax = 0.65;
  const terminalMin = 2; // minimum number of terminal (start/end) nodes
  const terminalMax = 3; // maximum number of terminal (start/end) nodes
  const rProb = 0.85; // probability threshold for resource assignment

  var proj = {
    n: n,
    N: new Array(n),
    D: new Array(n),
    A: new Array(n),
    P: new Array(n),
    pStr:new Array(n),
    R: new Array(n),
    rNr: maxR,
    makespan: 0,
    es: new Array(n),
    lf: new Array(n),
    caBool: new Array(n),
    cpNr: 0,
    cps:[],
    cpStr:[],
    priority:new Array(n),
    sgsSt: new Array(n),
    sgsMakespan: 0,
    pgsSt: new Array(n),
    pgsMakespan: 0,
    goNodes:[],
    goLinks: []
  };
  for (var i = 0; i < n; i++) {
    proj.A[i] = new Array(n);
    proj.P[i] = new Array(n)
  }
  const alpha = Array.from(Array(n)).map((e, i) => i + 65);
  proj.N = alpha.map((x) => String.fromCharCode(x));

  // Helping Vars
  var pRand;
  var pTransBool; // true if transitive predecessor
  var pCount; // counter of transitive arcs
  var pOs; // the order strength of a generated project
  var projValidBool; // true if a generated project is feasible & acceptable
  var startCount; // counter of starting nodes
  var endCount; // counter of ending nodes
  var xCounter; // helping counter
  // Helping Arrays
  var startBool = new Array(n); // true if starting node
  var endBool = new Array(n); // true if ending node
  var eligBool = new Array(n); // true if eligible activity
  var addedBool = new Array(n); // true is activity added to the list
  var rFree = new Array(maxR);
  for (var i = 0; i < maxR; i++) {
    rFree[i] = new Array(timeHorizon);
  }

  // generate the project
  do {
    // initializations
    for (var i = 0; i < n; i++) {
      proj.D[i] = 0;
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
    projValidBool = true; // project feasible and acceptable

    // random durations
    for (var i = 0; i < n; i++) {
      proj.D[i] = Math.floor((Math.random() * dMax) + dMin);
    }

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
          projValidBool = false;
          console.log("CPM Network Infeasible: Cycles detected! (i-->j-->i):", i, j);
          res.end();
        } else if (proj.P[i][j] === 1 && i >= j) {
          projValidBool = false;
          console.log("CPM Network Infeasible: The topological order is wrong (i-->j && i>j):", i, j);
          res.end();
        }
        for (var k = i + 1; k < j; k++) {
          if (proj.P[i][k] === 1 && proj.P[k][j] === 1 && proj.P[i][j] !== 1) {
            projValidBool = false;
            console.log("CPM Network Infeasible: Transitive arc missing (i,k,j): (i-->k && k-->j && i!->j):", i, k, j);
            res.end();
          }
        }
      }
    }

    // OS in range?
    pOs = pCount/pMax;
    if (pOs < osMin || pOs > osMax) {
      projValidBool = false;
      // console.log("OS not acceptable");
    }

    // multiple ending nodes?
    if (projValidBool) {
      for (var i = 0; i < n; i++) {
        xCounter = proj.P[i].reduce((partialSum, a) => partialSum + a, 0); // sum of elements in P[i]
        if (xCounter === 0) { // no successors
          endCount++;
          endBool[i] = true;
        }
      }
      if (endCount < terminalMin || endCount > terminalMax) {
        projValidBool = false;
        // console.log("number of ending nodes not acceptable");
      }
    }

    // multiple starting nodes?
    if (projValidBool) {
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
        projValidBool = false;
        // console.log("number of starting nodes not acceptable");
      }
    }

    if (projValidBool) {
      // assign resources
      for (var i = 0; i < n; i++) {
        proj.R[i] = maxR;
        if(startBool[i]){
          proj.R[i] = 0;
        } else if (endBool[i]) {
          proj.R[i] = 2;
        } else {
          proj.R[i] = 1;
        }
        if (proj.R[i] === maxR) {
          console.log("Resource allocation error!");
        }
      }


    }

  } while (!projValidBool);

  /////////////////// CPM calculations
  // forwarf pass
  proj.makespan = 0;
  for (var i = 0; i < n; i++) {
    proj.es[i] = 0;
    for (var j = 0; j < i; j++) {
      if (proj.P[j][i] === 1) {
        proj.es[i] = Math.max(proj.es[i], proj.es[j] + proj.D[j]);
      }
    }
    proj.makespan = Math.max(proj.makespan, proj.es[i] + proj.D[i]);
  }
  //backward pass
  for (var i = n - 1; i >= 0; i--) {
    proj.lf[i] = proj.makespan;
    for (var j = i + 1; j < n; j++) {
      if (proj.P[i][j] === 1) {
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

  //////////////////////// find critical paths
  for (var i = 0; i < n; i++) {
    if (startBool[i] && proj.caBool[i]) { // starting node & critical
      criticalPathFinder(proj, i, [i]);
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

  //////////////////////// Prioritize activities
  var addedCounter = 0;
  for (var i = 0; i < n; i++) {
    addedBool[i] = false;
    if (startBool[i]) {
      eligBool[i] = true;
    } else {
      eligBool[i] = false;
    }
  }
  var minDur = dMax;
  var selectedJob = 0;
  while (addedCounter < n) {
    minDur = dMax + 1;
    selectedJob = n;
    for (var i = 0; i < n; i++) {
      if (eligBool[i] && proj.D[i] < minDur) {
        selectedJob = i;
        minDur = proj.D[i];
      }
    }
    proj.priority[addedCounter] = selectedJob;
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

  // Serial Schedule
  var currentJob;
  var maxPredFt;
  var rFeasible;
  var totalDur = 0;
  for (var r = 0; r < proj.rNr; r++) {
    for (var t = 0; t < timeHorizon; t++) {
      rFree[r][t] = true;
    }
  }
  for (var i = 0; i < n; i++) {
    currentJob = proj.priority[i];
    proj.sgsSt[currentJob] = 0;
    maxPredFt = 0;
    for (var j = 0; j < currentJob; j++) {
      if (proj.A[j][currentJob] === 1) {
        maxPredFt = Math.max(maxPredFt, proj.sgsSt[j] + proj.D[j]);
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
          proj.sgsSt[currentJob] = t;
          totalDur = Math.max(totalDur, t + proj.D[currentJob]);
          for (var u = t; u < t + proj.D[currentJob] ; u++) {
            rFree[proj.R[currentJob]][u] = false;
          }
          break;
        }
      }
    }
  }
  proj.sgsMakespan = totalDur;

  // Parallel Schedule
  totalDur = 0;
  addedCounter = 0;
  var predFeasible;
  for (var i = 0; i < n; i++) {
    proj.pgsSt[i] = 0;
    addedBool[i] = false;
  }
  for (var r = 0; r < proj.rNr; r++) {
    for (var t = 0; t < timeHorizon; t++) {
      rFree[r][t] = true;
    }
  }
  for (var t = 0; t < timeHorizon; t++) {
    for (var i = 0; i < n; i++) {
      currentJob = proj.priority[i];
      if (!addedBool[currentJob]) {
        predFeasible = true;
        for (var j = 0; j < currentJob; j++) {
          if (proj.A[j][currentJob] === 1){
            if (!addedBool[j] || (proj.pgsSt[j] + proj.D[j] > t)) {
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
            proj.pgsSt[currentJob] = t;
            addedBool[currentJob] = true;
            addedCounter++;
            for (var u = t; u < t + proj.D[currentJob]; u++) {
              rFree[proj.R[currentJob]][u] = false;
            }
            totalDur = Math.max(totalDur, t + proj.D[currentJob]);
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
  proj.pgsMakespan = totalDur;

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

  return proj;
}
