module.exports = cpmGenerate;

function cpmGenerate(){
  // general variables & parameters
  const n = 10;
  const dMin = 1;
  const dMax = 10;
  const pProb = 0.30;
  var pRand;
  var pTransBool; // true if transitive predecessor
  var pCount; // counter of transitive arcs
  const pMax = n*(n-1)/2; // max theoretical number of transitive arcs
  var os; // the order strength of a generated project
  const osMin = 0.45;
  const osMax = 0.65;
  var projValidBool; // true if a generated project is feasible & acceptable
  var startCount; // counter of starting nodes
  var endCount; // counter of ending nodes
  var xCounter; // helping counter
  var projDuration; // total duration of the project
  const terminalMin = 2; // minimum number of terminal (start/end) nodes
  const terminalMax = 3; // maximum number of terminal (start/end) nodes

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
  console.log(N);
  var est = new Array(n); // earliest start times
  var lst = new Array(n); // latest start times
  var eft = new Array(n); // earliest finish times
  var lft = new Array(n); // latest finish times
  var F = new Array(n); // float times


  // generate the project
  do {
    // initializations
    for (var i = 0; i < n; i++) {
      D[i] = 0;
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
    console.log(D);

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
    for (var i = 0; i < n; i++) {
      console.log("P[", i, "]:");
      console.log(P[i]);
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
          }
        }
      }
    }
    for (var i = 0; i < n; i++) {
      console.log("A[", i, "]:");
      console.log(A[i]);
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
    os = pCount/pMax;
    console.log("OS:", os);
    if (os < osMin || os > osMax) {
      projValidBool = false;
      console.log("OS not acceptable");
    }

    // multiple ending nodes?
    if (projValidBool) {
      for (var i = 0; i < n; i++) {
        xCounter = P[i].reduce((partialSum, a) => partialSum + a, 0); // sum of elements in P[i]
        if (xCounter === 0) { // no successors
          endCount++;
        }
      }
      console.log("ending nodes = ", endCount);
      if (endCount < terminalMin || endCount > terminalMax) {
        projValidBool = false;
        console.log("number of ending nodes not acceptable");
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
        if (xCounter === 0) { // no successors
          startCount++;
        }
      }
      console.log("starting nodes = ", startCount);
      if (startCount < terminalMin || startCount > terminalMax) {
        projValidBool = false;
        console.log("number of starting nodes not acceptable");
      }
    }

  } while (!projValidBool);

  /////////////////// solve the instance
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
  console.log("est: ", est)
  console.log("eft: ", eft)
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
  console.log("lst: ", lst)
  console.log("lft: ", lft)
  // Floats
  for (var i = 0; i < n; i++) {
    F[i] = lst[i] - est[i];
  }
  console.log("floats: ", F)
  console.log("total project duration: ", projDuration);

}
