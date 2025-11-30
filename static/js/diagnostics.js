
let maxWaitTime = 5000; 
let startTime = Date.now();
let checkInterval = 100; 
function checkFirebaseReady() {
  const elapsed = Date.now() - startTime;
  if (window.FirebaseAPI) {
    let unsubscribe = window.FirebaseAPI.subscribeStudents((students) => {
      if (students.length > 0) {
      } else {
      }
      if (unsubscribe) unsubscribe();
    });
    let unsubscribe2 = window.FirebaseAPI.subscribeUsersAndRoles((users) => {
      if (users.length > 0) {
      } else {
      }
      if (unsubscribe2) unsubscribe2();
    });
  } else if (elapsed < maxWaitTime) {
    setTimeout(checkFirebaseReady, checkInterval);
  } else {
  }
}
setTimeout(checkFirebaseReady, 200);
