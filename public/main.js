import allData from "./data.js";

let mockCourses = allData;

let blank_boxes = document.querySelectorAll("td");
let modal = document.getElementById("course-modal");
let modal_title = document.getElementById("modal-title");
let modal_info = document.getElementById("modal-info");
let modal_button = document.getElementById("close-modal-btn");
let target_box = null;
let course_list_container = document.getElementById("course-list-container");
let auto_register_btn = document.getElementById("auto-register-btn");
let auto_remove_btn = document.getElementById("auto-remove-btn");
let toast = document.getElementById("toast");
let grade_select = document.getElementById("grade-select");
let semester_select = document.getElementById("semester-select");
let affiliation_select = document.getElementById("affiliation-select");
let total_credits_display = document.getElementById("total-credits");


loadTimetable();

function getMyUserId() {
    let myId = localStorage.getItem("myUserId");
    if (!myId) {
        myId = "user_" + Math.random().toString(36).substring(2, 15);
        localStorage.setItem("myUserId", myId);
    }
    return myId;
}


async function loadTimetable() {
    const userId = getMyUserId();

    const res = await fetch(`/api/timetable?userId=${userId}`);
    const registered = await res.json();

    if (data.grade) grade_select.value = data.grade;
    if (data.semester) semester_select.value = data.semester;
    if (data.affiliation) affiliation_select.value = data.affiliation;

    console.log("☁️ クラウドからロードした時間割:", registered);

    if (registered && registered.length > 0) {
        registered.forEach((data) => {
            let box = document.querySelector(`td[data-day="${data.day}"][data-period="${data.period}"]`);
            if (box) {
                box.textContent = data.courseName;
                box.setAttribute("data-course-id", data.courseId);
                box.classList.remove("hover");
            }
        });
        updateTotalCredits();
    }
}


async function deleteReview(reviewId) {
    const res = await fetch(`/api/review`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            reviewId: reviewId,
            authorId: getMyUserId()
        })
    });
    return await res.json();
}


function getStarRating(scoreOut) {
    let starCount = Math.round(Number(scoreOut) / 2);
    return "★".repeat(starCount) + "☆".repeat(5 - starCount);
}


async function saveTimetable() {
    let registered = [];
    let registered_boxes = document.querySelectorAll("td[data-course-id]");

    registered_boxes.forEach((box) => {
        registered.push({
            day: box.getAttribute("data-day"),
            period: box.getAttribute("data-period"),
            courseId: box.getAttribute("data-course-id"),
            courseName: box.textContent
        });
    });

    const userId = getMyUserId();

    // 👇 ここ追加
    const grade = grade_select.value;
    const semester = semester_select.value;
    const affiliation = affiliation_select.value;

    await fetch('/api/timetable', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userId: userId,
            timetable: registered,
            grade: grade,
            semester: semester,
            affiliation: affiliation
        })
    });
}


function openModal(title, info) { //modalの出力関数
    modal_title.textContent = title;
    modal_info.innerText = info;
    modal.classList.remove("hidden");
}


async function getReviews() {
    try {
        const res = await fetch("/api/review");
        return await res.json();
    } catch (err) {
        console.error("取得失敗", err);
        return [];
    }
}


async function submitReview(data) {

    const res = await fetch("/api/review", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    const result = await res.json();
    return result;
}


async function handleReviewSubmit(container, courseId) {

    const text = container.querySelector(".review-text").value.trim();

    if (text.length < 3) {
        alert("三文字以上書いてください");
        return;
    }

    const slider = container.querySelectorAll(".how-hard");

    const data = {
        courseId,
        text: container.querySelector(".review-text").value,
        credits: slider[0].value,
        task: slider[1].value,
        authorId: getMyUserId()
    };

    await submitReview(data);

}


function createReviews(courseID) {
    let reviews = document.createElement("div");
    reviews.className = "review-container";

    reviews.innerHTML = `
    <h4 style="margin-top:20px">口コミ</h4>

    <div style="margin-bottom: 15px;">
            <label>楽単度（0〜10）: 
            <input type="range" class="how-hard" min="0" max="10" value="5">
            </label>
            <span class="slider-val">5</span>
    </div>

    <div style="margin-bottom: 15px;">
            <label>課題の量（0〜10）: 
            <input type="range" class="how-hard" min="0" max="10" value="5">
            </label>
            <span class="slider-val">5</span>
    </div>

    <textarea class="review-text" placeholder="この授業の感想を教えて" style="width: 100%; height: 60px; margin-bottom: 10px;"></textarea>

    <button class="post-btn">投稿</button>
    `;

    let slider = reviews.querySelectorAll(".how-hard");
    let sliderVal = reviews.querySelectorAll(".slider-val");

    slider.forEach((slider, index) => {
        slider.addEventListener("input", (e) => {
            sliderVal[index].textContent = e.target.value;
        });
    });

    let reviewBtn = reviews.querySelector(".post-btn");
    reviewBtn.addEventListener("click", () => {
        let text = reviews.querySelector(".review-text").value;
        let hardness = reviews.querySelector(".how-hard");

    });

    let postBtn = reviews.querySelector(".post-btn");

    postBtn.addEventListener("click", async () => {

        postBtn.textContent = "送信中"
        postBtn.disabled = true;

        await handleReviewSubmit(reviews, courseID);
        course_list_container.innerHTML = "";

        await showAvailableCourse(
            target_box.getAttribute("data-day"),
            target_box.getAttribute("data-period"),
            grade_select.value,
            semester_select.value
        );
        
    });

    return reviews;
}

let isLoading = false;

async function showAvailableCourse(day, period,grade,semester) {

    if (mockCourses.length === 0) {
        course_list_container.innerHTML = "<p>読み込み中...</p>";
        return;
    }

    if (isLoading) return;
    isLoading = true;
    
    course_list_container.innerHTML = "";

    console.log(semester);

    //let selectedGrade=mockCourses.find(sGrade=>{
      //  sGrade.grade.includes(grade)
    //});


    let availableCourses = mockCourses.filter(course =>
        course.day === day && String(course.period) === String(period)&&course.semester.includes(semester)
    );

    if (availableCourses.length > 0) { //授業が入っているときの処理

        let hr = document.createElement("hr");
        course_list_container.appendChild(hr);

        let reviews = await getReviews();

        for (let course of availableCourses) {
            let card = document.createElement("div");

            card.className = "course-card";

            card.innerHTML = `
            <h3>${course.name}</h3>
            <p>担当: ${course.professor}</p>
            `;

            let reviewContents = reviews.filter((reviews) => {
                return reviews.courseId === course.id;
            });

            let reviewListDiv = document.createElement("div");
            reviewListDiv.className = "review-list";

            if (reviewContents.length === 0) {
                reviewListDiv.innerHTML = "<p style='color:gray; font-size:14px;'>まだ口コミはありません</p>";
            } else {

                let totalCredits = 0;
                let totalTasks = 0;

                reviewContents.forEach((rev) => {
                    totalCredits += Number(rev.credits);
                    totalTasks += Number(rev.task);
                });

                let avgCredits = (totalCredits / reviewContents.length).toFixed(1);
                let avgTasks = (totalTasks / reviewContents.length).toFixed(1);
                let avgDiv = document.createElement("div");

                avgDiv.style.backgroundColor = "#fffbeb";
                avgDiv.style.padding = "10px";
                avgDiv.style.marginBottom = "15px";
                avgDiv.style.borderRadius = "8px";
                avgDiv.style.border = "1px solid #fde68a";

                avgDiv.innerHTML = `
                    <strong style="font-size: 14px; color: #92400e;">総合評価 (${reviewContents.length}件の口コミ)</strong><br>
                    <span style="font-size: 14px;">楽単度: <span style="color: #f59e0b; font-size: 16px;">${getStarRating(avgCredits)}</span> (${avgCredits})</span><br>
                    <span style="font-size: 14px;">課題の量: <span style="color: #f59e0b; font-size: 16px;">${getStarRating(avgTasks)}</span> (${avgTasks})</span>
                `;

                reviewListDiv.appendChild(avgDiv);

                reviewContents.forEach((rev) => {
                    let p = document.createElement("p");
                    p.style.fontSize = "14px";
                    p.style.borderBottom = "1px solid #ddd";
                    p.style.paddingBottom = "5px";

                    p.style.display = "flex";
                    p.style.justifyContent = "space-between";
                    p.style.alignItems = "center";

                    let textSpan = document.createElement("span");
                    textSpan.textContent = `楽単度:${rev.credits}/課題:${rev.task}「${rev.text}」`;

                    p.appendChild(textSpan);

                    if (rev.authorId === getMyUserId()) {

                        let deleteBtn = document.createElement("button");
                        deleteBtn.textContent = "削除";
                        deleteBtn.style.background = "none";
                        deleteBtn.style.border = "none";
                        deleteBtn.style.cursor = "pointer";
                        deleteBtn.style.fontSize = "16px";

                        deleteBtn.addEventListener("click", async () => {
                            if (confirm("本当にこの口コミを削除しますか？")) {
                                deleteBtn.disabled = true;
                                if (rev.id) {
                                    await deleteReview(rev.id);
                                }
                                if (target_box) {
                                    target_box.click();
                                }
                            }
                        });
                        p.appendChild(deleteBtn);
                    }

                    reviewListDiv.appendChild(p);
                });
            }
            card.appendChild(reviewListDiv);

            let reviewForm = createReviews(course.id);
            card.appendChild(reviewForm);


            let registerBtn = document.createElement("button");
            registerBtn.className = "register-btn";
            registerBtn.textContent = "この授業を登録する";
            registerBtn.style.marginTop = "10px";

            registerBtn.addEventListener("click", () => {
                target_box.textContent = course.name;
                target_box.setAttribute("data-course-id", course.id);
                target_box.classList.remove("hover");
                modal.classList.add("hidden");

                updateTotalCredits();
            });

            card.appendChild(registerBtn);

            course_list_container.appendChild(card);
        }
    } else { //授業候補が無い時の処理
        let p = document.createElement("p");
        p.style.textAlign = "center";
        p.style.color = "gray";
        p.style.marginTop = "15px";
        p.textContent = "このコマの授業候補はありません";
        course_list_container.appendChild(p);
    }
    isLoading = false;
}


function updateAffiliationOption() { //クラス選択等
    let grade = parseInt(grade_select.value);
    affiliation_select.innerHTML = "";

    if (grade === 1) {
        for (let i = 1; i <= 12; i++) {
            let opt = document.createElement("option");
            opt.value = i;
            opt.textContent = i + "組";
            affiliation_select.appendChild(opt);
        }
    } else if(grade===2&&semester_select.value==="前学期") {
        let programs = ["IA","IB","IC", "I1","I2","I3","I4","I5","I6", "M", "Ⅲ1", "Ⅲ2", "Ⅲ3", "Ⅲ4"];
        programs.forEach(p => {
            let opt = document.createElement("option");
            opt.value = p;
            opt.textContent = p;
            affiliation_select.appendChild(opt);
        });
    }else if(grade===2&&semester_select.value==="後学期"){
        let programs = ["メディア情報学","経営社会情報","情報数理工学","コンピュータサイエンス","デザイン思考データサイエンス","セキュリティ情報","Iエリア偶数番","Iエリア奇数番","計測制御システム","先端ロボティクス","機械システム","電子工学","光工学","物理工学","化学生命"];
        programs.forEach(p => {
            let opt = document.createElement("option");
            opt.value = p;
            opt.textContent = p;
            affiliation_select.appendChild(opt);
        });
    }else{
        let programs = ["メディア情報学","経営社会情報学","情報数理工学","コンピュータサイエンス","デザイン思考データサイエンス","セキュリティ情報","情報通信工学","電子情報","計測制御システム","先端ロボティクス","機械システム","電子工学","光工学","物理工学","化学生命"];
        programs.forEach(p => {
            let opt = document.createElement("option");
            opt.value = p;
            opt.textContent = p;
            affiliation_select.appendChild(opt);
        });
    }
}


function updateTotalCredits() { //単位の合計を出力する関数
    let totalCredits = 0;
    let registered_boxes = document.querySelectorAll("td[data-course-id]");

    registered_boxes.forEach((box) => {
        let courseID = box.getAttribute("data-course-id");
        let course = mockCourses.find(c => c.id === courseID);

        if (course && course.credits) {
            totalCredits += course.credits;
        }
    });
    total_credits_display.textContent = totalCredits;

    saveTimetable();
}


grade_select.addEventListener("change", updateAffiliationOption);
semester_select.addEventListener("change",updateAffiliationOption);
updateAffiliationOption();

// 🌟 一斉登録ボタンの処理
auto_register_btn.addEventListener("click", () => {
    console.log(affiliation_select.value);
    let selectedGrade = parseInt(grade_select.value);
    let selectedSemester = semester_select.value;
    let selectedAffiliation = affiliation_select.value;

    

    // app.js のフィルター部分（おさらい）
    let requiredCourses = mockCourses.filter(course => {
        return course.type === "必修" &&
            course.grade.includes(selectedGrade) &&
            course.semester.includes(selectedSemester) &&
        course.affiliation.includes(selectedAffiliation); // 🌟 これだけで「5組専用」も「共通」も完璧に拾える！
    });

    console.log(requiredCourses);

    // ① 条件に合う必修科目が無ければ、何もせずに終わる
    if (requiredCourses.length === 0) {
        toast.textContent = "条件に合う授業がありません";
        toast.style.backgroundColor = "#f59e0b";
        toast.classList.remove("hidden");
        setTimeout(() => {
            toast.classList.add("hidden");
            toast.style.backgroundColor = "#10b981";
        }, 3000);
        return;
    }

    // 🌟 ② 【追加】登録する必修科目があった場合のみ、今の時間割を全消しする！
    let registered_boxes = document.querySelectorAll("td[data-course-id]");
    registered_boxes.forEach((box) => {
        box.textContent = "+"; // 初期状態の「+」に戻す
        box.removeAttribute("data-course-id");
        box.classList.add("hover"); // 必要ならホバー演出も戻す
    });

    // ③ 必修科目をポチポチ入れていく
    requiredCourses.forEach((course) => {
        let select_box = document.querySelector(`td[data-day="${course.day}"][data-period="${course.period}"]`);

        if (select_box) {
            select_box.textContent = course.name;
            select_box.setAttribute('data-course-id', course.id);
            select_box.classList.remove("hover");
        }
    });

    toast.textContent = ` ${requiredCourses.length}件の必修科目を一括登録しました！`;
    toast.classList.remove("hidden");
    setTimeout(() => {
        toast.classList.add("hidden");
    }, 3000);

    // 最後に単位数計算（ここでクラウドへのセーブも走ります）
    updateTotalCredits();
});


auto_remove_btn.addEventListener("click", () => {
    let registered_boxes = document.querySelectorAll("td[data-course-id]");
    registered_boxes.forEach((box) => {
        box.textContent = "+";
        box.removeAttribute("data-course-id");
    });
    modal.classList.add("hidden");
    toast.textContent = "授業をすべて外しました";
    toast.style.backgroundColor = "ef4444";
    toast.classList.remove("hidden");
    setTimeout(() => {
        toast.classList.add("hidden");
        toast.style.backgroundColor = "#10b981";
    }, 3000);

    updateTotalCredits();
});


blank_boxes.forEach((element) => {
    element.addEventListener('click', () => {
        target_box = element;

        let day = element.getAttribute("data-day");
        let period = element.getAttribute("data-period");

        if (!day || !period) {
            return;
        }

        let courseID = element.getAttribute("data-course-id");

        course_list_container.innerHTML = "";

        if (courseID) {
            modal_title.textContent = "授業の詳細";

            let clickedCourse = mockCourses.find((course) => course.id === courseID);

            let infoText = "";
            let courseName = "不明な授業";

            if (clickedCourse) {
                courseName = clickedCourse.name;
                infoText = "担当: " + clickedCourse.professor;
            } else {
                infoText = day + "曜日の" + period + "限には「" + courseID + "」があります"; //ここ機能していない気がする
            }

            let removeBtn = document.createElement("button");
            removeBtn.className = "remove-btn";
            removeBtn.textContent = "この授業を外す";

            removeBtn.addEventListener("click", () => {
                target_box.textContent = "+";
                target_box.removeAttribute("data-course-id");
                modal.classList.add("hidden");

                updateTotalCredits();
            });

            course_list_container.append(removeBtn);
            openModal(courseName, infoText);


            showAvailableCourse(day, period,grade_select.value,semester_select.value);

        } else {
            let infoText = day + "曜日の" + period + "限に新しい授業を追加しますか？";

            openModal("空きコマ", infoText);

            showAvailableCourse(day, period,grade_select.value,semester_select.value);
        }
    });
});


modal_button.addEventListener('click', () => {
    modal.classList.add("hidden");
});