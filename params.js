//jshint esversion:6
module.exports = paramsFunc;

function paramsFunc(){
  const n = 10;
  const alpha = Array.from(Array(n)).map((e, i) => i + 65);


  const paramsObj = {
    n : n,
    N : alpha.map((x) => String.fromCharCode(x)),
    dMin : 1,
    dMax : 10,
    rMax : 3,
    prCount : 9,
    prAbr : ["SPT", "LPT", "MIS", "MTS", "EST", "EFT", "LST", "LFT", "MF"],
    prNames : [
      "Shortest Processing Time First",
      "Longest Processing Time First",
      "Most Immediate Successors First",
      "Most Total Successors First",
      "Minimum Earliest Start Time First",
      "Minimum Earliest Finish Time First",
      "Minimum Latest Start Time First",
      "Minimum Latest Finish Time First",
      "Minimum Float First"
    ],
    pertDevMin : 30,
    pertDevMax : 90,
    rcMin : [40, 90, 140],
    rcMax : [80, 130, 190],
    hoursPerDay : 8,
    resNames : ["Technology", "Design", "Marketing"],
    resTypeNames : ["Junior", "Associate", "Senior"],
    cpiName: "mcqCpi",
    cpiQuestion: "How do you identify a critical path?",
    cpiOptions : [
      "(A) A path of critical activities (zero floats)",
      "(B) The longest path of the project",
      "(C) A & B",
      "(D) None of the above"
    ],
    cpiSol: 1
  };

  return paramsObj;
}
