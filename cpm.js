//jshint esversion:6
module.exports = cpmGenerate;

function criticalPathFinder(proj, job, currentPath){
  const sucNr = proj.arcs[job].reduce((partialSum, a) => partialSum + a, 0); // sum of elements in P[job]

  if (sucNr === 0) { //Job is ending node (currentPath is a new critical path)
    var cumDur = 0;
    for (var i = 0; i < currentPath.length; i++) { // cumulative duration of currentPath
      cumDur = cumDur + proj.durations[currentPath[i]];
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
      if (proj.arcs[job][i] === 1) { // is a successor of Job
        if (proj.floats[i] === 0) { // i is a critical acctivity
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
  // general variables & parameters
  const n = 10;
  const dMin = 1;
  const dMax = 10;
  const timeHorizon = n * dMax;
  const maxR = 3;
  const pProb = 0.30;
  var pRand;
  var pTransBool; // true if transitive predecessor
  var pCount; // counter of transitive arcs
  const pMax = n*(n-1)/2; // max theoretical number of transitive arcs
  var pOs; // the order strength of a generated project
  const osMin = 0.45;
  const osMax = 0.65;
  var projValidBool; // true if a generated project is feasible & acceptable
  var startCount; // counter of starting nodes
  var endCount; // counter of ending nodes
  var xCounter; // helping counter
  var projDuration; // total duration of the project
  const terminalMin = 2; // minimum number of terminal (start/end) nodes
  const terminalMax = 3; // maximum number of terminal (start/end) nodes
  const rProb = 0.85; // probability threshold for resource assignment

  // Array creations
  var D = new Array(n); // D[i]: duration of i
  var P = new Array(n); // P[i][j]:1 ==> i is a transitive predecessor of j
  var A = new Array(n); // A[i][j]:1 ==> i is a immediate predecessor of j (Arc (i,j) exists)
  for (var i = 0; i < n; i++) {
    P[i] = new Array(n);
    A[i] = new Array(n);
  }
  const alpha = Array.from(Array(n)).map((e, i) => i + 65);
  const N = alpha.map((x) => String.fromCharCode(x));
  var pNames = new Array(n); // string names of the immediate predecessors
  var est = new Array(n); // earliest start times
  var lst = new Array(n); // latest start times
  var eft = new Array(n); // earliest finish times
  var lft = new Array(n); // latest finish times
  var F = new Array(n); // float times
  var critBool = new Array(n); // true if critical activity
  var startBool = new Array(n); // true if starting node
  var endBool = new Array(n); // true if ending node
  var R = new Array(n); // resource requirement of the activities
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
      D[i] = 0;
      pNames[i] = '';
      startBool[i] = false;
      endBool[i] = false;
      for (var j = 0; j < n; j++) {
        P[i][j] = 0;
        A[i][j] = 0;
      }
    }
    pCount = 0; // OS counter
    startCount = 0; // starting nodes counter
    endCount = 0; // ending nodes counter
    projValidBool = true; // project feasible and acceptable

    // random durations
    for (var i = 0; i < n; i++) {
      D[i] = Math.floor((Math.random() * dMax) + dMin);
    }

    // random transitive network
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < n; j++) {
        if (i < j) { // topological order
          pRand = Math.random();
          if (pRand < pProb) { // random precedences
            P[i][j] = 1;
            pCount++; // increase OS counter
            for (var k = 0; k < i; k++) { // transitive updates
              if (P[k][i] === 1 && P[k][j] === 0) {
                P[k][j] = 1; // add to transitive predecessors
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
        if (i < j && P[i][j] === 1) { // topological order
          pTransBool = false;
          for (var k = i+1; k < j; k++) { // transitive predecessor?
            if (P[i][k] === 1 && P[k][j] === 1) {
              pTransBool = true;
              break;
            }
          }
          if (!pTransBool) { // if not transitive, then immediate
            A[i][j] = 1; // immediate predecessor
            if (pNames[j].length > 0) {
              pNames[j] = pNames[j] + ", " + N[i];
            } else {
              pNames[j] = pNames[j] + N[i];
            }
          }
        }
      }
    }

    // network feasible?
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < n; j++) {
        if (P[i][j] === 1 && P[j][i] === 1) {
          projValidBool = false;
          console.log("CPM Network Infeasible: Cycles detected! (i-->j-->i):", i, j);
          res.end();
        } else if (P[i][j] === 1 && i >= j) {
          projValidBool = false;
          console.log("CPM Network Infeasible: The topological order is wrong (i-->j && i>j):", i, j);
          res.end();
        }
        for (var k = i + 1; k < j; k++) {
          if (P[i][k] === 1 && P[k][j] === 1 && P[i][j] !== 1) {
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
        xCounter = P[i].reduce((partialSum, a) => partialSum + a, 0); // sum of elements in P[i]
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
          if (P[j][i] === 1) {
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

  } while (!projValidBool);

  /////////////////// CPM calculations
  // forwarf pass
  projDuration = 0;
  for (var i = 0; i < n; i++) {
    est[i] = 0;
    for (var j = 0; j < i; j++) {
      if (P[j][i] === 1) {
        est[i] = Math.max(est[i], eft[j]);
      }
    }
    eft[i] = est[i] + D[i];
    projDuration = Math.max(projDuration, eft[i]);
  }
  //backward pass
  for (var i = n - 1; i >= 0; i--) {
    lft[i] = projDuration;
    for (var j = i + 1; j < n; j++) {
      if (P[i][j] === 1) {
        lft[i] = Math.min(lft[i], lst[j]);
      }
    }
    lst[i] = lft[i] - D[i];
  }
  // Floats
  for (var i = 0; i < n; i++) {
    F[i] = lst[i] - est[i];
    if (F[i] === 0) {
      critBool[i] = true;
    } else {
      critBool[i] = false;
    }
  }

  // assign resources
  for (var i = 0; i < n; i++) {
    R[i] = maxR;
    if(startBool[i]){
      R[i] = 0;
    } else if (endBool[i]) {
      R[i] = 2;
    } else {
      const rand = Math.random();
      if (rand < rProb) {
        R[i] = 1;
      } else {
        R[i] = 2;
      }
    }
    if (R[i] === maxR) {
      console.log("Resource allocation error!");
    }
  }

  ///////////////////////// Create the project objective to export
  const proj = {
    n: n,
    names: N,
    durations: D,
    arcs: A,
    precedences: P,
    predStrings:pNames,
    resources: R,
    makespan: projDuration,
    es: est,
    ef: eft,
    ls: lst,
    lf: lft,
    floats: F,
    caBools: critBool,
    cpNr: 0,
    cps:[],
    cpStrings:[],
    priorities:[],
    serialSt: [],
    parallelSt: [],
    goNodes:[],
    goLinks: []
  };

  //////////////////////// find critical paths
  for (var i = 0; i < n; i++) {
    if (startBool[i] && critBool[i]) { // starting node & critical
      criticalPathFinder(proj, i, [i]);
    }
  }
  for (var i = 0; i < proj.cpNr; i++) { // creating cp names
    let cpName = '';
    cpName = cpName + proj.names[proj.cps[i][0]];
    for (var j = 1; j < proj.cps[i].length; j++) {
      cpName = cpName + '-' + proj.names[proj.cps[i][j]];
    }
    proj.cpStrings.push(cpName);
  }

  //////////////////////// Prioritize activities
  var addedCounter = 0;
  for (var i = 0; i < proj.n; i++) {
    addedBool[i] = false;
    if (startBool[i]) {
      eligBool[i] = true;
    } else {
      eligBool[i] = false;
    }
  }
  var minDur = dMax;
  var selectedJob = 0;
  while (addedCounter < proj.n) {
    minDur = dMax + 1;
    selectedJob = proj.n;
    for (var i = 0; i < proj.n; i++) {
      if (eligBool[i] && proj.durations[i] < minDur) {
        selectedJob = i;
        minDur = proj.durations[i];
      }
    }
    proj.priorities[addedCounter] = selectedJob;
    addedCounter++;
    addedBool[selectedJob] = true;
    eligBool[selectedJob] = false;
    for (var i = selectedJob + 1; i < proj.n; i++) {
      if ((proj.arcs[selectedJob][i] === 1)) {
        eligBool[i] = true;
        for (var j = 0; j < i; j++) {
          if ((proj.arcs[j][i] === 1) && !addedBool[j]) {
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
  for (var r = 0; r < maxR; r++) {
    for (var t = 0; t < timeHorizon; t++) {
      rFree[r][t] = true;
    }
  }
  for (var i = 0; i < proj.n; i++) {
    currentJob = proj.priorities[i];
    maxPredFt = 0;
    for (var j = 0; j < currentJob; j++) {
      if ((proj.arcs[j][currentJob] === 1) && (maxPredFt < proj.serialSt[j] + proj.durations[j])) {
        maxPredFt = proj.serialSt[j] + proj.durations[j];
      }
    }
    for (var t = maxPredFt; t < timeHorizon; t++) {
      if (rFree[proj.resources[currentJob]][t]) {
        rFeasible = true;
        for (var u = t + 1; u < t + proj.durations[currentJob] ; u++) {
          if (!rFree[proj.resources[currentJob]][u]) {
            rFeasible = false;
            break;
          }
        }
        if (rFeasible) {
          proj.serialSt[currentJob] = t;
          for (var u = t; u < t + proj.durations[currentJob] ; u++) {
            rFree[proj.resources[currentJob]][u] = false;
          }
          break;
        }
      }
    }
  }


  ///// gojs nodes and links arrays
  const startNode = { key: 0, text: "Start", length: 0, earlyStart: 0, lateFinish: 0, critical: true };
  proj.goNodes.push(startNode); // dummy start node
  const endNode = { key: proj.n+1, text: "End", length: 0, earlyStart: proj.makespan, lateFinish: proj.makespan, critical: true };
  proj.goNodes.push(endNode); // dummy end node
  for (var i = 0; i < proj.n; i++) { // real nodes
    const newNode = { key: i+1, text: proj.names[i], length: proj.durations[i], earlyStart: proj.es[i], lateFinish: proj.lf[i], critical: proj.caBools[i] };
    proj.goNodes.push(newNode);
  }
  for (var i = 0; i < proj.n; i++) {
    if (startBool[i]) {
      const startLink = { from: 0, to: i+1 };
      proj.goLinks.push(startLink);
    }
    for (var j = i+1; j < proj.n; j++) {
      if (proj.arcs[i][j] === 1) {
        const newLink = { from: i+1, to: j+1 };
        proj.goLinks.push(newLink);
      }
    }
    if (endBool[i]) {
      const endLink = { from: i+1, to: proj.n+1 };
      proj.goLinks.push(endLink);
    }
  }

  return proj;
}
