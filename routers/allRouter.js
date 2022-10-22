const express = require("express");
const router = express.Router();
const awsCloudfront = require("../utils/awsCloudfront");
const awsCloudfrontService = new awsCloudfront();
const myUtil = require("../utils/myUtil")
const myUtilService = new myUtil();
const ticketModel = require("../models/ticketModel.js");
const ticketModelService = new ticketModel();
const awsElasticache = require("../utils/awsElasticache");
const awsElasticacheService = new awsElasticache();
const elbController = require("../controllers/elbController.js");
const awsSQS = require("../utils/awsSQS")
const awsSQSService = new awsSQS();

router.get("/all/agenda", async function (req, res) {
  console.log("/all/agenda called");
  const start_time = new Date().getTime();
  var agendaProvider = req.query.agendaProvider;
  var agendaProvider_cache_key = agendaProvider;

  // get cache 
  const result_cached = await awsElasticacheService.hget(agendaProvider_cache_key);
  if (result_cached) {
    console.log("agendaProvider_cache_key exists");
    res.send({"result": result_cached,"processed_time": myUtilService.get_process_time(start_time)});
    return;
  }

  // main logic
  const result = await ticketModelService.get_agenda_by_agenda_provider(agendaProvider);
  // set cache 
  await awsElasticacheService.hset(agendaProvider_cache_key, result);

  res.send({"result": result,"processed_time": myUtilService.get_process_time(start_time)});
});

router.get("/all/cleanall", async function (req, res) {
  console.log("/all/cleanall called");
  await awsElasticacheService.cleanallcache();
  res.send({});
});

router.get("/all/buyticket", async function (req, res) {
  console.log("/all/buyticket called");
  var agendaProvider = req.query.agendaProvider;

  let resBuyTicket = await elbController.buyTicket(3000);

  // insert to database 
  let result_buy_ticket = await ticketModelService.get_insert_bought_ticket(agendaProvider); 
  console.log("result_buy_ticket: ", result_buy_ticket);

  // send a msg to queue  
  const boughtTicketId = result_buy_ticket.insertId;
  const sqs_queue_url = process.env.SQS_QUEUE_URL;
  let send_msg_result = await awsSQSService.send_msg(sqs_queue_url, boughtTicketId, agendaProvider);
  console.log("send_msg_result: ", send_msg_result);

  var end_time = new Date().getTime();
  var process_time_sec = (end_time - req.query.req_issued_time)/1000;
  res.send({
    "ticket_id": resBuyTicket.ticket_id,
    "process_time": process_time_sec
  });
});


router.get("/all/sqs/attrtibute", async function (req, res) {
  console.log("/all/sqs/attrtibute called");
  var sqs_queue_url = req.query.sqs_queue_url;
  const queue_attr = await awsSQSService.get_queue_attr(sqs_queue_url)
  res.send(queue_attr)
});

module.exports = router;