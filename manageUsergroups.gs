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
const IND_EMAIL = 1;
const IND_USER_ID = 2;
const IND_ERROR = 3;

const SLACK_API_URL = "https://slack.com/api/";
const API_USERGROUPS_LIST = SLACK_API_URL + "usergroups.list";
const API_USERGROUPS_CREATE = SLACK_API_URL + "usergroups.create";
const API_USERS_LOOKUPBYEMAIL = SLACK_API_URL + "users.lookupByEmail";
const API_USERGROUPS_USERS_UPDATE = SLACK_API_URL + "usergroups.users.update";

let start_time = new Date();

/** UserGroupIDを求める */
function getUserGroupID() {
  console.log("START getUserGroupID");
  let usergroup_name = CELL_USER_GROUP_NAME.getValue();
  let usergroup_handle = CELL_USER_GROUP_HANDLE.getValue();
  let usergroup_id = CELL_USER_GROUP_ID.getValue();

  // GroupIDがわかっている場合はこのまま終了
  if (usergroup_id !== "") {
    return usergroup_id;
  } else {
    // ユーザーグループが未設定の場合は作成する
    let createdUserGroupId = createSlackUserGroup(usergroup_name, usergroup_handle);
    CELL_USER_GROUP_ID.setValue(createdUserGroupId);
    return createdUserGroupId;
  }
}

/** ユーザーグループを作成する */
function createSlackUserGroup(userGroupName, userGroupHandle) {
  const payload = {
    token: USER_TOKEN,
    name: userGroupName,
    handle: userGroupHandle,
  };

  const options = {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: payload,
  };
  const response = UrlFetchApp.fetch(API_USERGROUPS_CREATE, options);
  const responseData = JSON.parse(response.getContentText());

  if (!responseData.ok) {
    throw new Error('ユーザーグループの作成に失敗しました');
  }

  return responseData.usergroup.id;
}

/** カンマ区切りのUserIDリストを返す */
function getUserIDs(usergroup_id) {
  console.log("START getUserIDs");
  let error_flg = false;
  let user_id_list = [];
  // 現状を取得
  let last_row = SHEET_USERS.getLastRow();
  let user_infos = SHEET_USERS.getRange(2, 1, last_row - 1, 4).getValues();
  console.log(user_infos);

  // UserIDが不明なものはメアドから検索
  let requests = [];
  user_infos.forEach(function (user_info) {
    console.log(user_info);
    // user_idがわかっているものは飛ばす
    if (user_info[IND_USER_ID] === "") {
      requests.push(genRequest(user_info[IND_EMAIL]));
    }
  });
  let responses = UrlFetchApp.fetchAll(requests);

  // 検索結果をもとに全SlackIDを求める
  let i = 0;
  user_infos.forEach(function (user_info) {
    console.log(user_info);
    // user_idがわかっているものはそのまま追加
    if (user_info[IND_USER_ID] === "") {
      let response = JSON.parse(responses[i].getContentText("UTF-8"));
      console.log(response);
      if (response['ok'] === true) {
        console.log(response['user']['id'] + " " + response['user']['name'] + ' ' + response['user']['profile']['email']);
        user_info[IND_USER_ID] = response['user']['id'];
      } else {
        user_info[IND_ERROR] = response['error'];
        error_flg = true;
      }
      i++;
    }
    user_id_list.push(user_info[IND_USER_ID]);
  });
  console.log(user_infos);

  // 書き込み
  SHEET_USERS.getRange(2, 1, last_row - 1, 4).setValues(user_infos);

  if (error_flg) {
    throw new Error(':UserID特定処理にてエラーが発生しました');
  }
  return user_id_list.join(',');
}

/** fetchAllで投げるためのAPI_USERS_LOOKUPBYEMAILリクエストを生成 */
function genRequest(email) {
  let request = {
    'url': API_USERS_LOOKUPBYEMAIL + "?token=" + USER_TOKEN + "&email=" + email,
    'contentType': 'application/x-www-form-urlencoded',
    'method': 'get',
  };
  return request;
}

/** ユーザーグループの更新 */
function updateUserGroup(usergroup_id, user_id_list) {
  console.log("START updateUserGroup");
  console.log(usergroup_id + "," + user_id_list);

  let payload = {
    'token': USER_TOKEN,
    'usergroup': usergroup_id,
    'users': user_id_list,
  };
  let params = { 'method': 'post', 'contentType': 'application/x-www-form-urlencoded', 'payload': payload };
  let response = callApi(API_USERGROUPS_USERS_UPDATE, params);
  console.log(response);
}

/** SlackAPIの呼び出し */
function callApi(url, params) {
  let response = UrlFetchApp.fetch(url, params);
  let resjson = JSON.parse(response.getContentText());
  console.log(resjson);
  if (resjson.ok !== true) {
    console.log('エラー：' + resjson['error']);
    throw new Error(resjson['error']);
  }
  return resjson;
}

/** 処理結果の書き込み */
function writeResult(message, isEnd) {
  // 処理自体終了の場合は処理時間なども記入
  if (isEnd) {
    let end_time = new Date();
    let last_date = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
    let processing_sec = (end_time - start_time) / 1000;
    CELL_LAST_TIME.setValue(last_date);
    CELL_PROCESSING_SEC.setValue(processing_sec);
  }

  CELL_RESULT.setValue(message);
}

/** メイン処理 */
function main() {
  writeResult("実行中", false);
  try {
    // UserGroupIDを求める
    let usergroup_id = getUserGroupID();
    // 各行のUserIDを求める
    let user_id_list = getUserIDs(usergroup_id);
    // Update実施
    updateUserGroup(usergroup_id, user_id_list);
  } catch (e) {
    writeResult(e.name + " " + e.message, true);
    return;
  }
  writeResult("終了", true);
}

main();