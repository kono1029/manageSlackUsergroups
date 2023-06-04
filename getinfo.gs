/** UserGroupIDを返す */
function getUserGroupID(user_id_list) {
  Logger.log("START getUserGroupID");

// GroupIDがわかっている場合はこのまま終了
if (usergroup_id !== "") {
  return usergroup_id;
}
  // 全UserGroupを取得して、そこから該当のものを探す
  let resjson = callApi(API_USERGROUPS_LIST, params);
  if (resjson == {}) {return "";}
  let usergroups = resjson.usergroups;

  let hit_usergroup = usergroups.find((v) => v.handle == usergroup_handle);
  if (hit_usergroup === undefined){
    // ユーザーグループが未設定の場合は作成する
    Logger.log("ユーザーグループ："+usergroup_name+"を作成します");
    let createdUserGroupId = createSlackUserGroup(usergroup_name, usergroup_handle, user_id_list ,usergroup_team_id);
    CELL_USER_GROUP_ID.setValue(createdUserGroupId);
    return createdUserGroupId;
  }
  
  // 取得結果を記入
  CELL_USER_GROUP_ID.setValue(hit_usergroup['id']);
  Logger.log("hit_usergroup: "+hit_usergroup['id']);

  return hit_usergroup['id'];

}

/** UserIDリストを返す */
function getUserIDs(){
console.log("START getUserIDs");
let error_flg = false;
let user_id_list = [];

// 現状を取得
let last_row = SHEET_USERS.getLastRow();
let user_infos = SHEET_USERS.getRange(2, 1, last_row - 1, 4).getValues();
console.log(user_infos);

// UserIDが不明なものはEmailから検索
let requests = [];
user_infos.forEach(function(user_info){
  console.log(user_info);
  // user_idがわかっているものは飛ばす
  if(user_info[IND_USER_ID] == ""){
    requests.push(genRequest(user_info[IND_EMAIL]));
  }
});
let responses = UrlFetchApp.fetchAll(requests);

// 検索結果をもとに全SlackIDを求める
let i = 0;
user_infos.forEach(function(user_info){
  console.log(user_info);
  // user_idがわかっているものはそのまま追加
  if(user_info[IND_USER_ID] == ""){
    let response = JSON.parse(responses[i].getContentText("UTF-8"));
    console.log(response);
    if (response['ok'] == true) {
      console.log(response['user']['id'] + " " + response['user']['name'] + ' ' + response['user']['profile']['email']);
      user_info[IND_USER_ID] = response['user']['id'];
    } else {
      user_info[IND_ERROR] = 'UserIDが不正です';
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
  throw new Error(':UserIDが不正です')
}
return user_id_list.join(',');

}

/** fetchAllで投げるためのAPI_USERS_LOOKUPBYEMAILリクエストを生成 */
function genRequest(email) {
const request = {
  'url': API_USERS_LOOKUPBYEMAIL + "?token=" + USER_TOKEN + "&email=" + email,
  'contentType': 'application/x-www-form-urlencoded',
  'method': 'get',
};
return request;
}