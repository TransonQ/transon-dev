function stringify(obj: any) {
  // 遍历对象的每个属性
  for (let key in obj) {
    // 判断属性值的类型
    if (typeof obj[key] === "object" || Array.isArray(obj[key])) {
      // 如果是复杂类型，使用 JSON.stringify() 进行转换
      obj[key] = JSON.stringify(obj[key]);
    }
  }

  return obj;
}

function parse(obj: any) {
  // 遍历对象的每个属性
  for (let key in obj) {
    // 判断属性值的类型
    if (typeof obj[key] === "string") {
      try {
        // 尝试解析字符串为对象或数组
        obj[key] = JSON.parse(obj[key]);
      } catch (error) {}
    }
  }

  return obj;
}

export const modify = { stringify, parse };
