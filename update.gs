/** ユーザーグループの作成 */
function createSlackUserGroup(usergroup_name, usergroup_handle, user_id_list ,usergroup_team_id) {
  Logger.log("START createSlackUserGroup");

  params.payload.name = usergroup_name;
  params.payload.handle = usergroup_handle;
  params.payload.users = user_id_list;
  params.payload.team_id = usergroup_team_id;

  const response = UrlFetchApp.fetch(API_USERGROUPS_CREATE, params);
  const responseData = JSON.parse(response.getContentText());

  if (!responseData.ok) {
    throw new Error('ユーザーグループの作成に失敗しました');
  }
  return responseData.usergroup.id;
}

/** ユーザーグループの更新 */
function updateUserGroup(usergroup_id, user_id_list, usergroup_team_id) {
  Logger.log("START updateUserGroup");
  Logger.log(usergroup_id + "," + user_id_list+ "," + usergroup_team_id);

  params.payload.usergroup = usergroup_id;
  params.payload.users = user_id_list;
  params.payload.team_id = usergroup_team_id;

  const response = callApi(API_USERGROUPS_USERS_UPDATE, params);
  Logger.log(response);
}