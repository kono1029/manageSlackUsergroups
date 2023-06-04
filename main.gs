const SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();
const SHEET_USERS = SPREADSHEET.getSheetByName('users');
const SHEET_CONFIG = SPREADSHEET.getSheetByName('CONFIG');
const CELL_USER_GROUP_NAME = SHEET_CONFIG.getRange(2, 2); // グループ名
const CELL_USER_GROUP_HANDLE = SHEET_CONFIG.getRange(3, 2); // ハンドル
const CELL_USER_GROUP_ID = SHEET_CONFIG.getRange(4, 2); // グループID
const CELL_WORKSPACE_ID = SHEET_CONFIG.getRange(5, 2); // ワークスペースID
const CELL_LAST_TIME = SHEET_CONFIG.getRange(6, 2); // 最終実行時刻
const CELL_RESULT = SHEET_CONFIG.getRange(7, 2); // 処理結果
const CELL_PROCESSING_SEC = SHEET_CONFIG.getRange(8, 2); // 処理時間
const USER_TOKEN = PropertiesService.getScriptProperties().getProperty("USER_TOKEN"); // User OAuth Token
const IND_NAME = 0;
const IND_EMAIL = 1;
const IND_USER_ID = 2;
const IND_ERROR = 3;

const SLACK_API_URL = "https://slack.com/api/";
const API_USERGROUPS_LIST = SLACK_API_URL + "usergroups.list";
const API_USERGROUPS_CREATE = SLACK_API_URL + "usergroups.create";
const API_USERS_LOOKUPBYEMAIL = SLACK_API_URL + "users.lookupByEmail";
const API_USERGROUPS_USERS_UPDATE = SLACK_API_URL + "usergroups.users.update";

const start_time = new Date();

const usergroup_id = CELL_USER_GROUP_ID.getValue();
const usergroup_name = CELL_USER_GROUP_NAME.getValue();
const usergroup_handle = CELL_USER_GROUP_HANDLE.getValue();
const usergroup_team_id = CELL_WORKSPACE_ID.getValue();

let payload = {'token': USER_TOKEN};
let params = { 'method': 'post', 'contentType': 'application/x-www-form-urlencoded', 'payload': payload };  

/** SlackAPIの呼び出し */
function callApi(url, params) {
  Logger.log("START callApi");

  const response = UrlFetchApp.fetch(url, params);
  const resjson = JSON.parse(response.getContentText());
  Logger.log(resjson);
  if (resjson.ok !== true) {
    Logger.log('エラー：' + resjson['error']);
    throw new Error(resjson['error']);
  }
  return resjson;
}

/** 処理結果の書き込み */
function writeResult(message, isEnd) {
  // 処理自体終了の場合は処理時間なども記入
  if (isEnd) {
    const end_time = new Date();
    const last_date = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
    const processing_sec = (end_time - start_time) / 1000;
    CELL_LAST_TIME.setValue(last_date);
    CELL_PROCESSING_SEC.setValue(processing_sec);
  }

  CELL_RESULT.setValue(message);
}

/** メイン処理 */
function main() {
  writeResult("実行中", false);
  try {
    // 各行のUserIDを求める
    const user_id_list = getUserIDs();
    // UserGroupIDを求める
    const usergroup_id = getUserGroupID(user_id_list);
    // Update実施
    updateUserGroup(usergroup_id, user_id_list, usergroup_team_id);
  } catch (e) {
    writeResult(e.name + " " + e.message, true);
    return;
  }
  writeResult("終了", true);
}

main();