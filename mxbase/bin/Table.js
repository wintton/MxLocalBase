class Table {

  #set = {};
  fileManager = {}; 

  constructor(manager,tableName,BasePath){
    fileManager = manager;
    this.tableName = tableName;
    this.BasePath = BasePath; 
  }

  get fileManager(){
    return 
  }

  get CurPath(){
    return this.BasePath + "/" + this.tableName;
  }

  loadTableSet(){
    
  }

}