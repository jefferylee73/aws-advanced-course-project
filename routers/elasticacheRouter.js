const express = require("express");
const router = express.Router();
const empModel = require("../models/empModel");
const empModelService = new empModel();
const awsElasticache = require("../utils/awsElasticache");
const awsElasticacheService = new awsElasticache();
const emp_list_key = "emp_list";
const myUtil = require("../utils/myUtil")
const myUtilService = new myUtil();

router.get("/elasticache/list_employee", async function (req, res) {
  console.log("/elasticache/list_employee called");
  const start_time = new Date().getTime();
  const result = await empModelService.list_employee();
  res.send({"result": result,"processed_time": myUtilService.get_process_time(start_time)});
});

router.get("/elasticache/list_employee_cached", async function (req, res) {
  console.log("/elasticache/list_employee_cached called");
  const start_time = new Date().getTime();
  // get cache
  const result_cached = await awsElasticacheService.get(emp_list_key);
  if (result_cached) {
    console.log("emp_list cache exists");
    res.send({"result": result_cached,"processed_time": myUtilService.get_process_time(start_time)});
    return;
  }
  
  const result = await empModelService.list_employee();
  // set cache
  await awsElasticacheService.set(emp_list_key, result);
  
  res.send({"result": result,"processed_time": myUtilService.get_process_time(start_time)});
});

router.get("/elasticache/clean", async function (req, res) {
  console.log("/elasticache/clean called");
  await awsElasticacheService.del(emp_list_key);
  res.send({});
});

module.exports = router;