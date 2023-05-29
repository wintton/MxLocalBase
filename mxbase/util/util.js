const log = (content) => {
  console.log(content)
} 

let compareMap = {
  "=":{
    "name":"等于",
    value:"=",
    compare:(value,target) => {
      return value == target;
    }
  },
  ">":{
    "name":"大于",
    value:">",
    compare:(value,target) => {
      return value * 1 > target * 1;
    }
  },
  ">=":{
    "name":"大于等于",
    value:">=",
    compare:(value,target) => {
      return value * 1 >= target * 1;
    }
  },
  "<":{
    "name":"小于",
    value:"<",
    compare:(value,target) => {
      return value * 1 < target * 1;
    }
  },
  "<=":{
    "name":"小于等于",
    value:"<=",
    compare:(value,target) => {
      return value * 1 <= target * 1;
    }
  },
  "!=":{
    "name":"不等于",
    value:"!=",
    compare:(value,target) => {
      return value != target;
    }
  },
  "in":{
    "name":"包含",
    value:"in",
    compare:(value,target) => {
      return value.indexOf(target) > -1;
    }
  },
  "!in":{
    "name":"不包含",
    value:"!in",
    compare:(value,target) => {
      return value.indexOf(target) < 0;
    }
  }, 
}

function compare(srcValue,type,targetValue){ 
  if(typeof compareMap[type] == "undefined"){
    throw("未知的比较类型：" + type);
  }
  return compareMap[type].compare(srcValue,targetValue);
}

module.exports = {
  log,
  compareMap,
  compare
}